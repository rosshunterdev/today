import { useLiveQuery } from 'dexie-react-hooks';
import { bringOver, dismissLeftovers, findLeftovers } from '../store/leftovers';
import { dayLabel, daysBetween } from '../day/logicalDay';
import { CarryOverNote } from './CarryOverNote';

export function LeftoversNote({ today }: { today: string }) {
  const leftovers = useLiveQuery(() => findLeftovers(today), [today]);
  if (!leftovers) return null;

  const { weekday, date } = dayLabel(leftovers.day);
  const label = daysBetween(leftovers.day, today) <= 6 ? weekday : date;

  return (
    <CarryOverNote
      label={label}
      items={leftovers.tasks}
      onBring={(ids) => void bringOver(today, ids)}
      onDismiss={() => void dismissLeftovers(today)}
    />
  );
}
