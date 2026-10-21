import { db } from './db';
import type { Mark, Task } from '../model';
import { byPosition, positionBetween } from '../order/position';

export const nowIso = () => new Date().toISOString();

export async function listDay(day: string): Promise<Task[]> {
  const rows = await db.tasks.where('day').equals(day).toArray();
  return rows.filter((t) => !t.deleted).sort(byPosition);
}

// Read-then-write inside one rw transaction, so tasks added at the same moment
// (fast typing, key repeat) queue up instead of claiming the same position.
export function addTask(
  day: string,
  opts: { afterId?: string; text?: string; indent?: 0 | 1 } = {},
): Promise<Task> {
  return db.transaction('rw', db.tasks, async () => {
    const rows = await listDay(day);
    const i = opts.afterId ? rows.findIndex((t) => t.id === opts.afterId) : -1;
    const prev = i >= 0 ? rows[i] : rows[rows.length - 1];
    const next = i >= 0 ? rows[i + 1] : undefined;
    const now = nowIso();
    const task: Task = {
      id: crypto.randomUUID(),
      day,
      text: opts.text ?? '',
      done: false,
      doneAt: null,
      position: positionBetween(prev?.position ?? null, next?.position ?? null),
      indent: opts.indent ?? 0,
      mark: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    await db.tasks.add(task);
    return task;
  });
}

async function patch(id: string, changes: Partial<Task>): Promise<void> {
  await db.tasks.update(id, { ...changes, updatedAt: nowIso() });
}

export const updateText = (id: string, text: string) => patch(id, { text });
export const setIndent = (id: string, indent: 0 | 1) => patch(id, { indent });
export const setMark = (id: string, mark: Mark) => patch(id, { mark });
export const setNotes = (id: string, notes: string) => patch(id, { notes });
export const setDone = (id: string, done: boolean) => patch(id, { done, doneAt: done ? nowIso() : null });
export const deleteTask = (id: string) => patch(id, { deleted: true });

// A binned line goes back where it was. A line written since may have been given that same place,
// so then it slots in just before that line: two lines on one position would break inserts between them.
export function restoreTask(id: string): Promise<void> {
  return db.transaction('rw', db.tasks, async () => {
    const row = await db.tasks.get(id);
    if (!row) return;
    const live = await listDay(row.day);
    if (!live.some((t) => t.position === row.position)) return patch(id, { deleted: false });
    const before = live.filter((t) => t.position < row.position).pop();
    await patch(id, { deleted: false, position: positionBetween(before?.position ?? null, row.position) });
  });
}

export function moveTask(id: string, prevId: string | null, nextId: string | null): Promise<void> {
  return db.transaction('rw', db.tasks, async () => {
    const prev = prevId ? await db.tasks.get(prevId) : undefined;
    const next = nextId ? await db.tasks.get(nextId) : undefined;
    await patch(id, { position: positionBetween(prev?.position ?? null, next?.position ?? null) });
  });
}
