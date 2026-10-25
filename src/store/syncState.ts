import type { Table } from 'dexie';
import { db, type SyncFields } from './db';
import { KEY, type LocalRow, type TableName } from '../sync/rows';
import { positionRepairs } from '../order/repair';
import { nowIso } from './tasks';

export type { TableName } from '../sync/rows';

// Days and weeks first: a page's binned flag lands before its lines do.
export const SYNC_TABLES: TableName[] = ['days', 'weeks', 'tasks', 'goals'];

type Stored = LocalRow & SyncFields;
const table = (name: TableName) => db.table(name) as Table<Stored, string>;

// Last write wins per row, on updatedAt. A pulled row is stored as synced (syncedAt = updatedAt), so it's clean.
export function applyPulled(name: TableName, pulled: readonly { updatedAt: string }[]): Promise<void> {
  const rows = pulled as LocalRow[];
  const t = table(name);
  return db.transaction('rw', t, async () => {
    const local = await t.bulkGet(rows.map((r) => r[KEY[name]] as string));
    const take: Stored[] = [];
    for (const [i, row] of rows.entries()) {
      const mine = local[i];
      if (!mine || row.updatedAt > mine.updatedAt) take.push({ ...row, syncedAt: row.updatedAt });
      else if (row.updatedAt === mine.updatedAt && mine.syncedAt !== row.updatedAt) {
        await t.update(row[KEY[name]] as string, { syncedAt: row.updatedAt });
      }
    }
    await t.bulkPut(take);
  });
}

export async function dirtyRows(name: TableName): Promise<LocalRow[]> {
  return table(name).where('dirty').equals(1).toArray();
}

// Only rows unchanged since they were read count as synced: an edit made during the push stays dirty.
export function markPushed(name: TableName, rows: LocalRow[]): Promise<void> {
  const t = table(name);
  return db.transaction('rw', t, async () => {
    const keys = rows.map((r) => r[KEY[name]] as string);
    const now = await t.bulkGet(keys);
    for (const [i, row] of rows.entries()) {
      if (now[i]?.updatedAt === row.updatedAt) await t.update(keys[i], { syncedAt: row.updatedAt });
    }
  });
}

export function repairPositions(days: string[], weeks: string[]): Promise<void> {
  return db.transaction('rw', db.tasks, db.goals, async () => {
    const now = nowIso();
    for (const day of days) {
      const live = (await db.tasks.where('day').equals(day).toArray()).filter((t) => !t.deleted);
      for (const m of positionRepairs(live)) await db.tasks.update(m.id, { position: m.position, updatedAt: now });
    }
    for (const week of weeks) {
      const live = (await db.goals.where('week').equals(week).toArray()).filter((g) => !g.deleted);
      for (const m of positionRepairs(live)) await db.goals.update(m.id, { position: m.position, updatedAt: now });
    }
  });
}

export async function countDirty(): Promise<number> {
  const counts = await Promise.all(SYNC_TABLES.map((name) => table(name).where('dirty').equals(1).count()));
  return counts.reduce((a, b) => a + b, 0);
}

const watermarkKey = (name: TableName) => `pulled:${name}`;

export async function getWatermark(name: TableName): Promise<string | null> {
  return (await db.meta.get(watermarkKey(name)))?.value ?? null;
}

export async function setWatermark(name: TableName, iso: string): Promise<void> {
  await db.meta.put({ key: watermarkKey(name), value: iso });
}
