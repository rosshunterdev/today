import { useState } from 'react';

export interface CarryOverNoteProps {
  label: string;
  fromLabel?: string;
  items: { id: string; text: string }[];
  onBring: (ids: string[]) => void;
  onDismiss: () => void;
}

// The "N left" note and its picker, shared by day leftovers and week leftovers.
export function CarryOverNote({ label, fromLabel = label, items, onBring, onDismiss }: CarryOverNoteProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

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
          {label}: {items.length} left
        </button>
        <button type="button" className="leftovers-all" onClick={() => onBring(items.map((i) => i.id))}>
          Bring all
        </button>
        <button type="button" className="leftovers-dismiss" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="leftovers leftovers-panel">
      <p>Bring over from {fromLabel}:</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={picked.has(item.id)} onChange={() => toggle(item.id)} />
              {item.text}
            </label>
          </li>
        ))}
      </ul>
      <div className="leftovers-actions">
        <button type="button" disabled={picked.size === 0} onClick={() => onBring([...picked])}>
          Bring over
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Not now
        </button>
      </div>
    </div>
  );
}
