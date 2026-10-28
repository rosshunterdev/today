import type { Task } from '../model';
import { byPosition } from '../order/position';
import { ROLLOVER_HOUR, dayLabel, dayParts, dayToDate, daysBetween } from './logicalDay';
import { hasNotes } from './leftovers';
import { isHeading } from '../heading';

// A day ends at the 04:00 rollover on the next calendar day.
export function dayEnd(day: string): string {
  const d = dayToDate(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, ROLLOVER_HOUR).toISOString();
}

// The lines on a day's old page: unfinished when the day ended, whether still open or crossed off since.
// A heading comes along only when one of those lines sits under it, before the next heading.
export function pageLines(tasks: Task[], day: string): Task[] {
  const end = dayEnd(day);
  const kept: Task[] = [];
  let heading: Task | null = null;
  for (const t of tasks.filter((t) => t.day === day && !t.deleted).sort(byPosition)) {
    if (isHeading(t.text)) {
      heading = t;
      continue;
    }
    const real = t.text.trim() !== '' || hasNotes(t.notes);
    if (!real || (t.done && (t.doneAt === null || t.doneAt < end))) continue;
    if (heading) kept.push(heading);
    heading = null;
    kept.push(t);
  }
  return kept;
}

// Headings can't be crossed off, so only the lines under them decide.
export function isPageDone(lines: Pick<Task, 'done' | 'text'>[]): boolean {
  const real = lines.filter((l) => !isHeading(l.text));
  return real.length > 0 && real.every((l) => l.done);
}

// An old page's header: "Mon 19" for the last six days, the date ("12 Oct") before that.
export function pageTitle(day: string, today: string): string {
  if (daysBetween(day, today) > 6) return dayLabel(day).date;
  const { number, weekday } = dayParts(day);
  return `${weekday.slice(0, 3)} ${number}`;
}
