import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { binPage, type OldPage } from '../store/pages';
import { setDone } from '../store/tasks';
import { isPageDone } from '../day/pages';
import { dayLabel, daysBetween } from '../day/logicalDay';
import { OLD_DROP_ID } from '../order/drop';
import { TaskLine } from './TaskLine';
import { usePointerCoarse } from './usePointerCoarse';

const noop = () => {};

function pageTitle(page: OldPage, today: string): string {
  const { weekday, date } = dayLabel(page.day);
  const name = daysBetween(page.day, today) <= 6 ? weekday.slice(0, 3) : date;
  const open = page.lines.filter((l) => !l.done).length;
  return `${name} · ${open === 0 ? 'done' : open}`;
}

// Earlier days' unfinished lines, pinned beside today as a stack of torn-off pages.
// Lines can be crossed off and dragged out, never added to or edited.
export function OldPages({ pages, today }: { pages: OldPage[]; today: string }) {
  const [topDay, setTopDay] = useState<string | null>(null);
  const [confirmDay, setConfirmDay] = useState<string | null>(null);
  const coarse = usePointerCoarse();
  const { setNodeRef } = useDroppable({ id: OLD_DROP_ID, data: { list: 'old' } });
  if (pages.length === 0) return null;

  const top = pages.find((p) => p.day === topDay) ?? pages[0];
  const under = pages.filter((p) => p !== top);
  const open = top.lines.filter((l) => !l.done).length;

  // Binning can't be undone, so a page with open lines takes a second tap.
  function handleBin() {
    if (open > 0 && confirmDay !== top.day) setConfirmDay(top.day);
    else void binPage(top.day);
  }

  return (
    <section className="old-pages" aria-label="Old pages" ref={setNodeRef}>
      <article className="old-page" data-done={isPageDone(top.lines)}>
        <header>
          <h2>{pageTitle(top, today)}</h2>
          <button type="button" className="old-bin" data-confirm={confirmDay === top.day} onClick={handleBin}>
            {confirmDay === top.day ? `Bin ${open} open line${open === 1 ? '' : 's'}?` : 'Bin page'}
          </button>
        </header>
        <SortableContext items={top.lines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ol className="lines">
            {top.lines.map((line) => (
              <TaskLine
                key={line.id}
                task={line}
                list="old"
                label="Old task"
                readOnly
                coarse={coarse}
                focusRequested={false}
                onFocusHandled={noop}
                onFocusChange={noop}
                onText={noop}
                onEnter={noop}
                onBackspaceEmpty={noop}
                onToggleDone={() => void setDone(line.id, !line.done)}
              />
            ))}
          </ol>
        </SortableContext>
      </article>
      {under.map((p) => (
        <button key={p.day} type="button" className="old-page-peek" onClick={() => setTopDay(p.day)}>
          {pageTitle(p, today)}
        </button>
      ))}
    </section>
  );
}
