import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addTask, listDay, setDone } from './tasks';
import { findLeftovers, dismissLeftovers, bringOver } from './leftovers';

const MON = '2026-10-05';
const FRI = '2026-10-02';
const THU = '2026-10-01';

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
});

describe('leftovers store', () => {
  it('finds the most recent earlier day with unfinished tasks, skipping weekends', async () => {
    await addTask(THU, { text: 'old' });
    const done = await addTask(FRI, { text: 'done one' });
    await setDone(done.id, true);
    await addTask(FRI, { text: 'gym' });
    await addTask(FRI, { text: '   ' });
    const found = await findLeftovers(MON);
    expect(found?.day).toBe(FRI);
    expect(found?.tasks.map((t) => t.text)).toEqual(['gym']);
  });

  it('returns null once dismissed for today', async () => {
    await addTask(FRI, { text: 'gym' });
    await dismissLeftovers(MON);
    expect(await findLeftovers(MON)).toBeNull();
  });

  it('copies chosen tasks after today’s existing tasks, leaves originals, and dismisses', async () => {
    await addTask(MON, { text: 'already here' });
    const a = await addTask(FRI, { text: 'gym', indent: 1 });
    const b = await addTask(FRI, { text: 'groceries' });
    await addTask(FRI, { text: 'not chosen' });
    await bringOver(MON, [b.id, a.id]);
    const today = await listDay(MON);
    expect(today.map((t) => t.text)).toEqual(['already here', 'gym', 'groceries']);
    expect(today[1].indent).toBe(1);
    expect(today[1].id).not.toBe(a.id);
    expect((await listDay(FRI)).map((t) => t.text)).toEqual(['gym', 'groceries', 'not chosen']);
    expect(await findLeftovers(MON)).toBeNull();
  });
});
