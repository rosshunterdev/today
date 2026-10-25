import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Task, DayRecord, Goal, WeekRecord } from '../model';
import { pageLines } from '../day/pages';

// Sync bookkeeping on every row: dirty (0/1, indexable) while updatedAt differs from syncedAt,
// the updatedAt the server last confirmed. Kept out of the model: the UI never sees it.
export interface SyncFields {
  dirty?: 0 | 1;
  syncedAt?: string | null;
}

export interface MetaRecord {
  key: string;
  value: string;
}

export const db = new Dexie('today') as Dexie & {
  tasks: EntityTable<Task & SyncFields, 'id'>;
  days: EntityTable<DayRecord & SyncFields, 'day'>;
  goals: EntityTable<Goal & SyncFields, 'id'>;
  weeks: EntityTable<WeekRecord & SyncFields, 'week'>;
  meta: EntityTable<MetaRecord, 'key'>;
};

db.version(1).stores({
  tasks: 'id, day, updatedAt',
  days: 'day, updatedAt',
});

// v2: week goals. Existing tables are unchanged; listed again so the full schema reads in one place.
db.version(2).stores({
  tasks: 'id, day, updatedAt',
  days: 'day, updatedAt',
  goals: 'id, week, updatedAt',
  weeks: 'week, updatedAt',
});

// v3: pinned old pages replace the day leftovers note. Days the note already dealt with are binned,
// so tasks it copied forward don't come back as duplicate pages.
db.version(3)
  .stores({
    tasks: 'id, day, updatedAt',
    days: 'day, updatedAt',
    goals: 'id, week, updatedAt',
    weeks: 'week, updatedAt',
  })
  .upgrade(async (tx) => {
    const now = new Date().toISOString();
    const days = tx.table('days');
    const handled = (await days.toArray()).filter((r) => r.leftoversDismissed).map((r) => r.day as string).sort();
    await days.toCollection().modify((r) => {
      delete r.leftoversDismissed;
      r.binned = false;
      r.updatedAt = now;
    });
    const last = handled[handled.length - 1];
    if (!last) return;
    const earlier: Task[] = await tx.table('tasks').where('day').below(last).toArray();
    const toBin = [...new Set(earlier.map((t) => t.day))].filter((day) => pageLines(earlier, day).length > 0);
    await days.bulkPut(toBin.map((day) => ({ day, binned: true, updatedAt: now })));
  });

// v4: sync. Every row starts dirty (nothing has reached the server yet); meta holds the owner and pull watermarks.
db.version(4)
  .stores({
    tasks: 'id, day, updatedAt, dirty',
    days: 'day, updatedAt, dirty',
    goals: 'id, week, updatedAt, dirty',
    weeks: 'week, updatedAt, dirty',
    meta: 'key',
  })
  .upgrade(async (tx) => {
    for (const name of ['tasks', 'days', 'goals', 'weeks']) {
      await tx.table(name).toCollection().modify((r) => {
        r.dirty = 1;
        r.syncedAt = null;
      });
    }
  });

// Every store write already sets updatedAt, so dirtiness follows from it here and no store function changes.
type Synced = SyncFields & { updatedAt: string };
for (const table of [db.tasks, db.days, db.goals, db.weeks] as unknown as Table<Synced>[]) {
  table.hook('creating', (_key, obj) => {
    obj.dirty = obj.updatedAt === obj.syncedAt ? 0 : 1;
  });
  table.hook('updating', (mods, _key, obj) => {
    const changes = mods as Partial<Synced>;
    const updatedAt = 'updatedAt' in changes ? changes.updatedAt : obj.updatedAt;
    const syncedAt = 'syncedAt' in changes ? changes.syncedAt : obj.syncedAt;
    return { dirty: updatedAt === syncedAt ? 0 : 1 };
  });
}
