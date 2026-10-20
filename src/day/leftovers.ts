import type { Task } from '../model';

export function isUnfinished(t: Pick<Task, 'done' | 'deleted' | 'text'>): boolean {
  return !t.done && !t.deleted && t.text.trim() !== '';
}
