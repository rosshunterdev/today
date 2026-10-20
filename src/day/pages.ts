import type { Task } from '../model';
import { byPosition } from '../order/position';
import { ROLLOVER_HOUR, dayToDate } from './logicalDay';

// A day ends at the 04:00 rollover on the next calendar day.
export function dayEnd(day: string): string {
  const d = dayToDate(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, ROLLOVER_HOUR).toISOString();
}

// The lines on a day's old page: unfinished when the day ended, whether still open or crossed off since.
export function pageLines(tasks: Task[], day: string): Task[] {
  const end = dayEnd(day);
  return tasks
    .filter((t) => t.day === day && !t.deleted && t.text.trim() !== '' && (!t.done || (t.doneAt !== null && t.doneAt >= end)))
    .sort(byPosition);
}

export function isPageDone(lines: Pick<Task, 'done'>[]): boolean {
  return lines.length > 0 && lines.every((l) => l.done);
}
