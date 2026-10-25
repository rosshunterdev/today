import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addTask, updateText } from './tasks';
import { makeTask } from '../test/factories';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('sync bookkeeping', () => {
  it('marks a new line dirty', async () => {
    const t = await addTask('2026-10-25', { text: 'milk' });
    expect((await db.tasks.get(t.id))!.dirty).toBe(1);
  });

  it('marks a line clean once synced, and dirty again on the next edit', async () => {
    const t = await addTask('2026-10-25', { text: 'milk' });
    await db.tasks.update(t.id, { syncedAt: t.updatedAt });
    expect((await db.tasks.get(t.id))!.dirty).toBe(0);
    await new Promise((r) => setTimeout(r, 2));
    await updateText(t.id, 'oat milk');
    expect((await db.tasks.get(t.id))!.dirty).toBe(1);
  });

  it('keeps a row from the server clean, whether new or replacing one', async () => {
    const row = makeTask({ id: 'from-server', updatedAt: '2026-10-25T01:00:00.000Z' });
    await db.tasks.put({ ...row, syncedAt: row.updatedAt });
    expect((await db.tasks.get('from-server'))!.dirty).toBe(0);
    await db.tasks.put({ ...row, text: 'newer', updatedAt: '2026-10-25T02:00:00.000Z', syncedAt: '2026-10-25T02:00:00.000Z' });
    expect((await db.tasks.get('from-server'))!.dirty).toBe(0);
  });

  it('finds dirty rows by index on every table', async () => {
    await db.days.put({ day: '2026-10-25', binned: true, updatedAt: '2026-10-25T01:00:00.000Z' });
    await db.weeks.put({ week: '2026-10-19', leftoversDismissed: true, updatedAt: '2026-10-25T01:00:00.000Z' });
    expect(await db.days.where('dirty').equals(1).count()).toBe(1);
    expect(await db.weeks.where('dirty').equals(1).count()).toBe(1);
  });
});
