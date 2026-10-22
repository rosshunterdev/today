export const ROLLOVER_HOUR = 4;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateToDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function logicalDay(now: Date): string {
  const shifted = new Date(now.getTime());
  shifted.setHours(shifted.getHours() - ROLLOVER_HOUR);
  return dateToDay(shifted);
}

export function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// The day after: tomorrow's page. Steps the calendar date, not 24 hours, so daylight saving can't skip or repeat a day.
export function nextDay(day: string): string {
  const date = dayToDate(day);
  date.setDate(date.getDate() + 1);
  return dateToDay(date);
}

export function dayLabel(day: string): { weekday: string; date: string } {
  const date = dayToDate(day);
  return {
    weekday: date.toLocaleDateString('en-NZ', { weekday: 'long' }),
    date: date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
  };
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dayToDate(to).getTime() - dayToDate(from).getTime()) / 86_400_000);
}

// The parts of the journal header: "20", "Tuesday", "October".
export function dayParts(day: string): { number: number; weekday: string; month: string } {
  const date = dayToDate(day);
  return {
    number: date.getDate(),
    weekday: date.toLocaleDateString('en-NZ', { weekday: 'long' }),
    month: date.toLocaleDateString('en-NZ', { month: 'long' }),
  };
}
