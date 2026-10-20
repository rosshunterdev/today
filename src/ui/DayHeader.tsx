import { dayParts } from '../day/logicalDay';
import { ThemeSwitch } from './ThemeSwitch';

export function DayHeader({ day }: { day: string }) {
  const { number, weekday, month } = dayParts(day);
  return (
    <header className="day-header">
      {/* tabIndex -1: focus lands here when a phone turns back to today. */}
      <h1 id="today-heading" tabIndex={-1}>
        <span className="day-number">{number}</span>{' '}
        <span className="day-words">
          <span>{weekday}</span> <span className="day-month">{month}</span>
        </span>
      </h1>
      <ThemeSwitch />
    </header>
  );
}
