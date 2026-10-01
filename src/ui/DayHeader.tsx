import { dayLabel } from '../day/logicalDay';

export function DayHeader({ day }: { day: string }) {
  const { weekday, date } = dayLabel(day);
  return (
    <header className="day-header">
      <h1>{weekday}</h1>
      <p>{date}</p>
    </header>
  );
}
