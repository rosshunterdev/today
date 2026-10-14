import { db } from './db';
import type { Goal, Task } from '../model';
import { byPosition, positionBetween } from '../order/position';
import { nowIso } from './tasks';
import { copyGoalForWeek, leftoversSourceWeek } from '../day/week';
import { isUnfinished } from '../day/leftovers';

export async function listWeek(week: string): Promise<Goal[]> {
  const rows = await db.goals.where('week').equals(week).toArray();
  return rows.filter((g) => !g.deleted).sort(byPosition);
}

// Read-then-write in one rw transaction, same reason as addTask: fast typing can't claim one position twice.
export function addGoal(week: string, opts: { afterId?: string; text?: string } = {}): Promise<Goal> {
  return db.transaction('rw', db.goals, async () => {
    const rows = await listWeek(week);
    const i = opts.afterId ? rows.findIndex((g) => g.id === opts.afterId) : -1;
    const prev = i >= 0 ? rows[i] : rows[rows.length - 1];
    const next = i >= 0 ? rows[i + 1] : undefined;
    const now = nowIso();
    const goal: Goal = {
      id: crypto.randomUUID(),
      week,
      text: opts.text ?? '',
      done: false,
      doneAt: null,
      position: positionBetween(prev?.position ?? null, next?.position ?? null),
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    await db.goals.add(goal);
    return goal;
  });
}

async function patch(id: string, changes: Partial<Goal>): Promise<void> {
  await db.goals.update(id, { ...changes, updatedAt: nowIso() });
}

export const updateGoalText = (id: string, text: string) => patch(id, { text });
export const setGoalDone = (id: string, done: boolean) => patch(id, { done, doneAt: done ? nowIso() : null });
export const deleteGoal = (id: string) => patch(id, { deleted: true });

export function moveGoal(id: string, prevId: string | null, nextId: string | null): Promise<void> {
  return db.transaction('rw', db.goals, async () => {
    const prev = prevId ? await db.goals.get(prevId) : undefined;
    const next = nextId ? await db.goals.get(nextId) : undefined;
    await patch(id, { position: positionBetween(prev?.position ?? null, next?.position ?? null) });
  });
}

// A moved line is a new row on the other side plus a soft delete here, in one transaction,
// so a crash can never leave it on both lists or on neither.
export function taskToGoal(taskId: string, week: string, prevId: string | null, nextId: string | null): Promise<Goal | null> {
  return db.transaction('rw', db.tasks, db.goals, async () => {
    const task = await db.tasks.get(taskId);
    if (!task || task.deleted) return null;
    const prev = prevId ? await db.goals.get(prevId) : undefined;
    const next = nextId ? await db.goals.get(nextId) : undefined;
    const now = nowIso();
    const goal: Goal = {
      id: crypto.randomUUID(),
      week,
      text: task.text,
      done: task.done,
      doneAt: task.doneAt,
      position: positionBetween(prev?.position ?? null, next?.position ?? null),
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    await db.goals.add(goal);
    await db.tasks.update(taskId, { deleted: true, updatedAt: now });
    return goal;
  });
}

export function goalToTask(goalId: string, day: string, prevId: string | null, nextId: string | null): Promise<Task | null> {
  return db.transaction('rw', db.tasks, db.goals, async () => {
    const goal = await db.goals.get(goalId);
    if (!goal || goal.deleted) return null;
    const prev = prevId ? await db.tasks.get(prevId) : undefined;
    const next = nextId ? await db.tasks.get(nextId) : undefined;
    const now = nowIso();
    const task: Task = {
      id: crypto.randomUUID(),
      day,
      text: goal.text,
      done: goal.done,
      doneAt: goal.doneAt,
      position: positionBetween(prev?.position ?? null, next?.position ?? null),
      indent: 0,
      mark: null,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    await db.tasks.add(task);
    await db.goals.update(goalId, { deleted: true, updatedAt: now });
    return task;
  });
}

export interface WeekLeftovers {
  week: string;
  goals: Goal[];
}

export async function findWeekLeftovers(week: string): Promise<WeekLeftovers | null> {
  const record = await db.weeks.get(week);
  if (record?.leftoversDismissed) return null;
  const earlier = await db.goals.where('week').below(week).toArray();
  const source = leftoversSourceWeek(earlier, week);
  if (!source) return null;
  const goals = earlier.filter((g) => g.week === source && isUnfinished(g)).sort(byPosition);
  return { week: source, goals };
}

export async function dismissWeekLeftovers(week: string): Promise<void> {
  await db.weeks.put({ week, leftoversDismissed: true, updatedAt: nowIso() });
}

export async function bringOverGoals(week: string, ids: string[]): Promise<void> {
  await db.transaction('rw', db.goals, db.weeks, async () => {
    const sources = (await db.goals.bulkGet(ids)).filter((g): g is Goal => g !== undefined).sort(byPosition);
    const existing = await listWeek(week);
    let prev = existing[existing.length - 1]?.position ?? null;
    const now = nowIso();
    const copies = sources.map((s) => {
      prev = positionBetween(prev, null);
      return copyGoalForWeek(s, week, prev, crypto.randomUUID(), now);
    });
    await db.goals.bulkAdd(copies);
    await dismissWeekLeftovers(week);
  });
}
