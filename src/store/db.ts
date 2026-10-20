import Dexie, { type EntityTable } from 'dexie';
import type { Task, DayRecord, Goal, WeekRecord } from '../model';
import { pageLines } from '../day/pages';

export const db = new Dexie('today') as Dexie & {
  tasks: EntityTable<Task, 'id'>;
  days: EntityTable<DayRecord, 'day'>;
  goals: EntityTable<Goal, 'id'>;
  weeks: EntityTable<WeekRecord, 'week'>;
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
