import type { Task } from '../model';

export function isUnfinished(t: Pick<Task, 'done' | 'deleted' | 'text'>): boolean {
  return !t.done && !t.deleted && t.text.trim() !== '';
}

export function leftoversSourceDay(tasks: Task[], today: string): string | null {
  let best: string | null = null;
  for (const t of tasks) {
    if (t.day < today && isUnfinished(t) && (best === null || t.day > best)) best = t.day;
  }
  return best;
}

export function copyForToday(source: Task, today: string, position: string, id: string, now: string): Task {
  return {
    id,
    day: today,
    text: source.text,
    done: false,
    doneAt: null,
    position,
    indent: source.indent,
    mark: source.mark,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
}
