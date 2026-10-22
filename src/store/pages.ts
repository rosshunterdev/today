import { db } from './db';
import type { Goal, Task } from '../model';
import { positionBetween } from '../order/position';
import { pageLines } from '../day/pages';
import { listDay, nowIso, taskToDay } from './tasks';

export interface OldPage {
  day: string;
  lines: Task[];
}

// Earlier days that still have lines unfinished at day end and haven't been binned, newest first.
export async function listOldPages(today: string): Promise<OldPage[]> {
  const [earlier, binned] = await Promise.all([
    db.tasks.where('day').below(today).toArray(),
    db.days.where('day').below(today).filter((r) => r.binned).primaryKeys(),
  ]);
  const skip = new Set(binned);
  const byDay = new Map<string, Task[]>();
  for (const t of earlier) {
    if (skip.has(t.day)) continue;
    const list = byDay.get(t.day);
    if (list) list.push(t);
    else byDay.set(t.day, [t]);
  }
  return [...byDay.keys()]
    .sort()
    .reverse()
    .map((day) => ({ day, lines: pageLines(byDay.get(day)!, day) }))
    .filter((p) => p.lines.length > 0);
}

export function pageLineToGoal(id: string, week: string, prevId: string | null, nextId: string | null): Promise<Goal | null> {
  return db.transaction('rw', db.tasks, db.goals, async () => {
    const line = await db.tasks.get(id);
    if (!line || line.deleted) return null;
    const prev = prevId ? await db.goals.get(prevId) : undefined;
    const next = nextId ? await db.goals.get(nextId) : undefined;
    const now = nowIso();
    const goal: Goal = {
      id: crypto.randomUUID(),
      week,
      text: line.text,
      notes: line.notes ?? '',
      done: false,
      doneAt: null,
      position: positionBetween(prev?.position ?? null, next?.position ?? null),
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    await db.goals.add(goal);
    await db.tasks.update(id, { deleted: true, updatedAt: now });
    return goal;
  });
}

// The > on an old line: the same move as dropping it at the end of today.
// Read and move in one rw transaction (taskToDay joins it), so fast taps on two lines queue up
// instead of both claiming the slot after the same last line.
export function pageLineToTodayEnd(id: string, today: string): Promise<Task | null> {
  return db.transaction('rw', db.tasks, async () => {
    const rows = await listDay(today);
    return taskToDay(id, today, rows[rows.length - 1]?.id ?? null, null);
  });
}

export function binPage(day: string): Promise<void> {
  return db.transaction('rw', db.tasks, db.days, async () => {
    const now = nowIso();
    const lines = pageLines(await db.tasks.where('day').equals(day).toArray(), day);
    for (const line of lines) await db.tasks.update(line.id, { deleted: true, updatedAt: now });
    await db.days.put({ day, binned: true, updatedAt: now });
  });
}
