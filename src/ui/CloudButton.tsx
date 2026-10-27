import { useRef, useState } from 'react';
import { useSync } from '../sync/SyncProvider';
import { CloudIcon } from './icons';
import { SyncCard } from './SyncCard';

// Beside the moon (D-026). The dot means something needs a look: changes waiting, a lapsed session, or a question.
export function CloudButton() {
  const sync = useSync();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  if (sync.phase === 'off') return null;

  const note =
    sync.phase === 'asking'
      ? 'a question is waiting'
      : sync.phase === 'lapsed'
        ? 'signed out'
        : sync.phase === 'signedIn' && sync.pending > 0
          ? 'changes waiting'
          : null;

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div className="sync">
      <button
        ref={button}
        type="button"
        className="sync-button"
        aria-label={note ? `Sync (${note})` : 'Sync'}
        aria-expanded={open}
        aria-controls="sync-card"
        onClick={() => setOpen((o) => !o)}
      >
        <CloudIcon />
        {note && <span className="sync-dot" aria-hidden="true" />}
      </button>
      {open && <SyncCard id="sync-card" onClose={close} />}
    </div>
  );
}
