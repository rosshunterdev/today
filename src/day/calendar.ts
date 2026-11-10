import type { Task } from '../model';
import { byPosition } from '../order/position';
import { isHeading } from '../heading';
import { hasNotes } from './leftovers';
import { dateToDay, dayParts, dayToDate, daysBetween } from './logicalDay';
import { weekOf } from './week';

// A month is keyed "YYYY-MM", the start of every day key in it.
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  return dateToDay(new Date(y, m - 1 + by, 1)).slice(0, 7);
}

export function monthTitle(month: string): string {
  const first = `${month}-01`;
  return `${dayParts(first).month} ${dayToDate(first).getFullYear()}`;
}

// Steps the calendar date, not 24 hours, so daylight saving can't skip or repeat a day.
export function addDays(day: string, by: number): string {
  const date = dayToDate(day);
  date.setDate(date.getDate() + by);
  return dateToDay(date);
}

// The month as whole weeks, Monday first like the week page, so the first and last rows can reach into the months either side.
export function monthGrid(month: string): string[][] {
  const weeks: string[][] = [];
  for (let monday = weekOf(`${month}-01`); monthOf(monday) <= month; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  }
  return weeks;
}

// "Thursday 12 November".
export function dayTitle(day: string): string {
  const { number, weekday, month } = dayParts(day);
  return `${weekday} ${number} ${month}`;
}

export function relativeDay(day: string, today: string): string {
  const away = daysBetween(today, day);
  if (away === 0) return 'Today';
  if (away === 1) return 'Tomorrow';
  if (away === -1) return 'Yesterday';
  return away > 0 ? `In ${away} days` : `${-away} days ago`;
}

// For each day, its real lines in page order: true for crossed off. Headings, blank lines and deleted lines are left out.
export function dayMarks(tasks: Task[]): Map<string, boolean[]> {
  const marks = new Map<string, boolean[]>();
  for (const t of [...tasks].sort(byPosition)) {
    if (t.deleted || isHeading(t.text) || (t.text.trim() === '' && !hasNotes(t.notes))) continue;
    const list = marks.get(t.day);
    if (list) list.push(t.done);
    else marks.set(t.day, [t.done]);
  }
  return marks;
}
