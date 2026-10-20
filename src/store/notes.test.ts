import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { addTask, listDay, setNotes } from './tasks';
import { addGoal, bringOverGoals, goalToTask, listWeek, setGoalNotes, taskToGoal } from './goals';
import { pageLineToGoal, pageLineToTask } from './pages';

const DAY = '2026-10-20';
const OLD = '2026-10-16';
const WEEK = '2026-10-19';
const LAST = '2026-10-12';
const NOTE = 'ask about software projects\nwill she review it';
const pause = () => new Promise((r) => setTimeout(r, 5));

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

describe('notes', () => {
  it('new tasks and goals start with empty notes', async () => {
    expect((await addTask(DAY, { text: 'a' })).notes).toBe('');
    expect((await addGoal(WEEK, { text: 'b' })).notes).toBe('');
  });

  it('saves task and goal notes and bumps updatedAt', async () => {
    const t = await addTask(DAY, { text: 'message manager' });
    const g = await addGoal(WEEK, { text: 'assignment' });
    await pause();
    await setNotes(t.id, NOTE);
    await setGoalNotes(g.id, 'chapter 2');
    const task = (await db.tasks.get(t.id))!;
    const goal = (await db.goals.get(g.id))!;
    expect(task.notes).toBe(NOTE);
    expect(task.updatedAt > t.updatedAt).toBe(true);
    expect(goal.notes).toBe('chapter 2');
    expect(goal.updatedAt > g.updatedAt).toBe(true);
  });

  it('travel from today to the week and back', async () => {
    const t = await addTask(DAY, { text: 'message manager' });
    await setNotes(t.id, NOTE);
    const goal = await taskToGoal(t.id, WEEK, null, null);
    expect(goal!.notes).toBe(NOTE);
    const back = await goalToTask(goal!.id, DAY, null, null);
    expect(back!.notes).toBe(NOTE);
    expect((await listDay(DAY))[0].notes).toBe(NOTE);
  });

  it('travel off an old page onto today or into the week', async () => {
    const a = await addTask(OLD, { text: 'call bank' });
    const b = await addTask(OLD, { text: 'book flights' });
    await setNotes(a.id, 'ref 1234');
    await setNotes(b.id, 'check dates');
    expect((await pageLineToTask(a.id, DAY, null, null))!.notes).toBe('ref 1234');
    expect((await pageLineToGoal(b.id, WEEK, null, null))!.notes).toBe('check dates');
  });

  it('come along when last week’s goals are brought over', async () => {
    const g = await addGoal(LAST, { text: 'assignment' });
    await setGoalNotes(g.id, 'chapter 2');
    await bringOverGoals(WEEK, [g.id]);
    expect((await listWeek(WEEK))[0].notes).toBe('chapter 2');
  });
});
