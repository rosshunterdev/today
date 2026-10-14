import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { bringOver, dismissLeftovers, findLeftovers } from '../store/leftovers';
import { dayLabel, daysBetween } from '../day/logicalDay';

export function LeftoversNote({ today }: { today: string }) {
  const leftovers = useLiveQuery(() => findLeftovers(today), [today]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (!leftovers) return null;

  const { weekday, date } = dayLabel(leftovers.day);
  const label = daysBetween(leftovers.day, today) <= 6 ? weekday : date;

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!open) {
    return (
      <div className="leftovers">
        <button type="button" className="leftovers-open" onClick={() => setOpen(true)}>
          {label}: {leftovers.tasks.length} left
        </button>
        <button
          type="button"
          className="leftovers-all"
          onClick={() => void bringOver(today, leftovers.tasks.map((t) => t.id))}
        >
          Bring all
        </button>
        <button type="button" className="leftovers-dismiss" aria-label="Dismiss" onClick={() => void dismissLeftovers(today)}>
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="leftovers leftovers-panel">
      <p>Bring over from {label}:</p>
      <ul>
        {leftovers.tasks.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={picked.has(t.id)} onChange={() => toggle(t.id)} />
              {t.text}
            </label>
          </li>
        ))}
      </ul>
      <div className="leftovers-actions">
        <button type="button" disabled={picked.size === 0} onClick={() => void bringOver(today, [...picked])}>
          Bring over
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Not now
        </button>
      </div>
    </div>
  );
}
