import type { Task } from '../model';
import { isHeading } from '../heading';

export function hasNotes(notes: string | undefined): boolean {
  return (notes ?? '').trim() !== '';
}

// A real line has visible text or a note behind it. A heading is a label, never a job left over.
export function isUnfinished(t: Pick<Task, 'done' | 'deleted' | 'text' | 'notes'>): boolean {
  return !t.done && !t.deleted && !isHeading(t.text) && (t.text.trim() !== '' || hasNotes(t.notes));
}
