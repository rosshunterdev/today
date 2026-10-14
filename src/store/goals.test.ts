import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addGoal, deleteGoal, listWeek, moveGoal, setGoalDone, updateGoalText } from './goals';

const WEEK = '2026-10-12';

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

describe('goal store', () => {
  it('adds goals in order, and inserts after a given goal', async () => {
    const a = await addGoal(WEEK, { text: 'assignment' });
    await addGoal(WEEK, { text: 'run 3x' });
    await addGoal(WEEK, { afterId: a.id, text: 'read' });
    expect((await listWeek(WEEK)).map((g) => g.text)).toEqual(['assignment', 'read', 'run 3x']);
  });

  it('keeps weeks apart', async () => {
    await addGoal(WEEK, { text: 'this week' });
    await addGoal('2026-10-19', { text: 'next week' });
    expect((await listWeek(WEEK)).map((g) => g.text)).toEqual(['this week']);
  });

  it('edits, crosses off and soft-deletes, bumping updatedAt each time', async () => {
    const g = await addGoal(WEEK, { text: 'x' });
    const before = g.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await updateGoalText(g.id, 'assignment');
    await setGoalDone(g.id, true);
    let row = await db.goals.get(g.id);
    expect(row).toMatchObject({ text: 'assignment', done: true });
    expect(row!.doneAt).not.toBeNull();
    expect(row!.updatedAt > before).toBe(true);
    await setGoalDone(g.id, false);
    expect((await db.goals.get(g.id))!.doneAt).toBeNull();
    await deleteGoal(g.id);
    row = await db.goals.get(g.id);
    expect(row!.deleted).toBe(true);
    expect(await listWeek(WEEK)).toEqual([]);
  });

  it('reorders between neighbours', async () => {
    const a = await addGoal(WEEK, { text: 'a' });
    const b = await addGoal(WEEK, { text: 'b' });
    const c = await addGoal(WEEK, { text: 'c' });
    await moveGoal(c.id, a.id, b.id);
    expect((await listWeek(WEEK)).map((g) => g.text)).toEqual(['a', 'c', 'b']);
  });
});
