export const ROLLOVER_HOUR = 4;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function logicalDay(now: Date): string {
  const shifted = new Date(now.getTime());
  shifted.setHours(shifted.getHours() - ROLLOVER_HOUR);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

export function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayLabel(day: string): { weekday: string; date: string } {
  const date = dayToDate(day);
  return {
    weekday: date.toLocaleDateString('en-NZ', { weekday: 'long' }),
    date: date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }),
  };
}
