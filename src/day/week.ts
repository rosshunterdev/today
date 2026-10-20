import type { Goal } from '../model';
import { dateToDay, dayLabel, dayToDate, daysBetween } from './logicalDay';
import { isUnfinished } from './leftovers';

// Weeks run Monday to Sunday and are keyed by their Monday.
export function weekOf(day: string): string {
  const date = dayToDate(day);
  const sinceMonday = (date.getDay() + 6) % 7;
  return dateToDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday));
}

export function leftoversSourceWeek(goals: Goal[], week: string): string | null {
  let best: string | null = null;
  for (const g of goals) {
    if (g.week < week && isUnfinished(g) && (best === null || g.week > best)) best = g.week;
  }
  return best;
}

export function weekLeftoversLabel(source: string, week: string): string {
  return daysBetween(source, week) === 7 ? 'Last week' : `Week of ${dayLabel(source).date}`;
}

export function copyGoalForWeek(source: Goal, week: string, position: string, id: string, now: string): Goal {
  return {
    id,
    week,
    text: source.text,
    notes: source.notes ?? '',
    done: false,
    doneAt: null,
    position,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
}

// "19 to 25 October", or "28 September to 4 October" when the week crosses a month.
export function weekRange(week: string): string {
  const start = dayToDate(week);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const month = (d: Date) => d.toLocaleDateString('en-NZ', { month: 'long' });
  const from = start.getMonth() === end.getMonth() ? `${start.getDate()}` : `${start.getDate()} ${month(start)}`;
  return `${from} to ${end.getDate()} ${month(end)}`;
}
