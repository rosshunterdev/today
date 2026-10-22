import { useEffect, useState } from 'react';
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
  // Once it has shown lines it stays open until folded by hand, so clearing the last line keeps the cursor in place.
  const [keptOpen, setKeptOpen] = useState(false);
  // The whole section is a drop target, so a line dropped on the folded header goes to the end of Tomorrow.
  const { setNodeRef } = useDroppable({ id: LIST_DROP_ID.tomorrow, data: { list: 'tomorrow' } });

  useEffect(() => {
    if (hasLines) setKeptOpen(true);
  }, [hasLines]);

  if (hasLines === undefined) return null;
  const open = hasLines || openedByTap || keptOpen;

  function toggle() {
    const opening = !open;
    setOpenedByTap(opening);
    setKeptOpen(opening);
  }

  // No aria-label: the heading names the section, so a screen reader says "Tomorrow" once, not as region, heading and button.
  return (
    <section className="tomorrow" data-open={open} ref={setNodeRef}>
      <h2 className="tomorrow-heading">
        {hasLines ? (
          // Laid out like the button, with the arrow kept as an unseen spacer, so the word stays put when the first line lands.
          <span className="tomorrow-label">
            <span className="tomorrow-fold" aria-hidden="true">
              ▸
            </span>
            Tomorrow
          </span>
        ) : (
          <button
            type="button"
            className="tomorrow-toggle"
            aria-expanded={open}
            aria-controls="tomorrow-lines"
            onClick={toggle}
          >
            {/* A span, not CSS content: browsers read generated content into the button's name. */}
            <span className="tomorrow-fold" aria-hidden="true">
              ▸
            </span>
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
