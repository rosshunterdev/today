import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { makeTask } from '../test/factories';

const V2 = { tasks: 'id, day, updatedAt', days: 'day, updatedAt', goals: 'id, week, updatedAt', weeks: 'week, updatedAt' };
const OLD = '2026-10-01T00:00:00.000Z';

// Each test seeds a v2 database, then imports a fresh copy of the app's db so it upgrades on open.
beforeEach(async () => {
  vi.resetModules();
  await Dexie.delete('today');
});

async function seedV2(days: object[], tasks: object[]) {
  const v2 = new Dexie('today');
  v2.version(2).stores(V2);
  await v2.table('days').bulkPut(days);
  await v2.table('tasks').bulkAdd(tasks);
  v2.close();
}

describe('schema v3 upgrade', () => {
  it('bins days before the last handled leftovers and keeps later unfinished days as pages', async () => {
    await seedV2(
      [{ day: '2026-10-05', leftoversDismissed: true, updatedAt: OLD }],
      [
        makeTask({ id: 'copied', day: '2026-10-02', text: 'already carried over' }),
        makeTask({ id: 'pre-trip', day: '2026-10-06', text: 'still relevant' }),
      ],
    );
    const { db } = await import('./db');
    expect(db.verno).toBe(3);
    expect(await db.days.get('2026-10-02')).toMatchObject({ binned: true });
    expect((await db.days.get('2026-10-02'))!.updatedAt > OLD).toBe(true);
    expect(await db.days.get('2026-10-06')).toBeUndefined();
    const handled = await db.days.get('2026-10-05');
    expect(handled).toMatchObject({ binned: false });
    expect(handled).not.toHaveProperty('leftoversDismissed');
    // Tasks are never touched.
    expect((await db.tasks.get('copied'))!.deleted).toBe(false);
    db.close();
  });

  it('bins nothing when leftovers were never dismissed', async () => {
    await seedV2([], [makeTask({ id: 't', day: '2026-10-02' })]);
    const { db } = await import('./db');
    expect(await db.days.count()).toBe(0);
    expect(await db.tasks.get('t')).toBeDefined();
    db.close();
  });
});
