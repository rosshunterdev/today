import { db } from './db';
import type { Goal } from '../model';
import { byPosition, positionBetween } from '../order/position';
import { nowIso } from './tasks';

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
