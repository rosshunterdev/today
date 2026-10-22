import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable } from '@dnd-kit/core';
import { listDay } from '../store/tasks';
import { LIST_DROP_ID } from '../order/drop';
import { NotebookPage } from './NotebookPage';

// Tomorrow: folded under today's lines until tapped, and open whenever it has lines (D-030).
// Open comes from the data, so it survives reloads; the 4am turn remounts it (keyed on the day in App), folding it again.
export function TomorrowSection({ day }: { day: string }) {
  const hasLines = useLiveQuery(async () => (await listDay(day)).length > 0, [day]);
  const [openedByTap, setOpenedByTap] = useState(false);
  // The whole section is a drop target, so a line dropped on the folded header goes to the end of Tomorrow.
  const { setNodeRef } = useDroppable({ id: LIST_DROP_ID.tomorrow, data: { list: 'tomorrow' } });

  if (hasLines === undefined) return null;
  const open = hasLines || openedByTap;

  return (
    <section className="tomorrow" aria-label="Tomorrow" data-open={open} ref={setNodeRef}>
      <h2 className="tomorrow-heading">
        {hasLines ? (
          'Tomorrow'
        ) : (
          <button
            type="button"
            className="tomorrow-toggle"
            aria-expanded={open}
            aria-controls="tomorrow-lines"
            onClick={() => setOpenedByTap((was) => !was)}
          >
            Tomorrow
          </button>
        )}
      </h2>
      {open && (
        <div id="tomorrow-lines">
          <NotebookPage day={day} list="tomorrow" placeholder="what's on tomorrow?" startFocus={openedByTap} />
        </div>
      )}
    </section>
  );
}
