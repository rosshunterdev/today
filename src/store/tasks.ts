import { db } from './db';
import type { Mark, Task } from '../model';
import { byPosition, positionBetween } from '../order/position';

export const nowIso = () => new Date().toISOString();

export async function listDay(day: string): Promise<Task[]> {
  const rows = await db.tasks.where('day').equals(day).toArray();
  return rows.filter((t) => !t.deleted).sort(byPosition);
}

export async function addTask(
  day: string,
  opts: { afterId?: string; text?: string; indent?: 0 | 1 } = {},
): Promise<Task> {
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
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
  await db.tasks.add(task);
  return task;
}

async function patch(id: string, changes: Partial<Task>): Promise<void> {
  await db.tasks.update(id, { ...changes, updatedAt: nowIso() });
}

export const updateText = (id: string, text: string) => patch(id, { text });
export const setIndent = (id: string, indent: 0 | 1) => patch(id, { indent });
export const setMark = (id: string, mark: Mark) => patch(id, { mark });
export const setDone = (id: string, done: boolean) => patch(id, { done, doneAt: done ? nowIso() : null });
export const deleteTask = (id: string) => patch(id, { deleted: true });

export async function moveTask(id: string, prevId: string | null, nextId: string | null): Promise<void> {
  const prev = prevId ? await db.tasks.get(prevId) : undefined;
  const next = nextId ? await db.tasks.get(nextId) : undefined;
  await patch(id, { position: positionBetween(prev?.position ?? null, next?.position ?? null) });
}
