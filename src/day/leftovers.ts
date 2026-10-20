import type { Task } from '../model';

export function hasNotes(notes: string | undefined): boolean {
  return (notes ?? '').trim() !== '';
}

// A real line has visible text or a note behind it.
export function isUnfinished(t: Pick<Task, 'done' | 'deleted' | 'text' | 'notes'>): boolean {
  return !t.done && !t.deleted && (t.text.trim() !== '' || hasNotes(t.notes));
}
