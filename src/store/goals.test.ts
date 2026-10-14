import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addGoal, deleteGoal, goalToTask, listWeek, moveGoal, setGoalDone, taskToGoal, updateGoalText } from './goals';
import { addTask, listDay, setDone, setMark } from './tasks';

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

const DAY = '2026-10-14';

describe('moving between today and the week', () => {
  it('moves a task between two goals and soft-deletes the task', async () => {
    const a = await addGoal(WEEK, { text: 'a' });
    const b = await addGoal(WEEK, { text: 'b' });
    const task = await addTask(DAY, { text: 'assignment', indent: 1 });
    await setMark(task.id, 'star');

    const goal = await taskToGoal(task.id, WEEK, a.id, b.id);

    expect((await listWeek(WEEK)).map((g) => g.text)).toEqual(['a', 'assignment', 'b']);
    expect(goal).toMatchObject({ week: WEEK, text: 'assignment', done: false, deleted: false });
    expect(goal).not.toHaveProperty('indent');
    expect(goal).not.toHaveProperty('mark');
    const source = await db.tasks.get(task.id);
    expect(source!.deleted).toBe(true);
    expect(source!.updatedAt >= goal!.createdAt).toBe(true);
    expect(await listDay(DAY)).toEqual([]);
  });

  it('keeps a crossed-off task crossed off', async () => {
    const task = await addTask(DAY, { text: 'done thing' });
    await setDone(task.id, true);
    const doneAt = (await db.tasks.get(task.id))!.doneAt;
    const goal = await taskToGoal(task.id, WEEK, null, null);
    expect(goal).toMatchObject({ done: true, doneAt });
  });

  it('moves a goal to the end of today as a plain task', async () => {
    await addTask(DAY, { text: 'first' });
    const last = await addTask(DAY, { text: 'second' });
    const goal = await addGoal(WEEK, { text: 'assignment' });

    const task = await goalToTask(goal.id, DAY, last.id, null);

    expect((await listDay(DAY)).map((t) => t.text)).toEqual(['first', 'second', 'assignment']);
    expect(task).toMatchObject({ day: DAY, indent: 0, mark: null, deleted: false });
    expect((await db.goals.get(goal.id))!.deleted).toBe(true);
    expect(await listWeek(WEEK)).toEqual([]);
  });

  it('does nothing for a missing or already-deleted source', async () => {
    expect(await taskToGoal('nope', WEEK, null, null)).toBeNull();
    const goal = await addGoal(WEEK, { text: 'x' });
    await deleteGoal(goal.id);
    expect(await goalToTask(goal.id, DAY, null, null)).toBeNull();
    expect(await listDay(DAY)).toEqual([]);
  });
});
