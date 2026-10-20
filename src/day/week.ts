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
