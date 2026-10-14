import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { makeTask } from '../test/factories';

describe('schema v2 upgrade', () => {
  it('keeps v1 tasks and days and adds empty goals and weeks', async () => {
    const v1 = new Dexie('today');
    v1.version(1).stores({ tasks: 'id, day, updatedAt', days: 'day, updatedAt' });
    await v1.table('tasks').add(makeTask({ id: 'kept', text: 'old' }));
    await v1.table('days').put({ day: '2026-10-01', leftoversDismissed: true, updatedAt: '2026-10-01T00:00:00.000Z' });
    v1.close();

    // Imported only now, so the app's db opens (and upgrades) after v1 has written.
    const { db } = await import('./db');
    expect((await db.tasks.get('kept'))?.text).toBe('old');
    expect((await db.days.get('2026-10-01'))?.leftoversDismissed).toBe(true);
    expect(await db.goals.count()).toBe(0);
    expect(await db.weeks.count()).toBe(0);
    expect(db.verno).toBe(2);
  });
});
