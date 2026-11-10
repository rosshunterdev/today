import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { binPage, pageLineToTodayEnd, type OldPage } from '../store/pages';
import { setDone } from '../store/tasks';
import { isPageDone, pageTitle } from '../day/pages';
import { OLD_DROP_ID } from '../order/drop';
import { isHeading } from '../heading';
import { TaskLine } from './TaskLine';
import { usePointerCoarse } from './usePointerCoarse';

const noop = () => {};

// The line is about to leave the page, so keep keyboard users on the old pages: focus moves to the
// next line's >, else the one before, else the week heading. A > already pressed is skipped while
// its line is on its way out.
function focusAfterMove(button: HTMLButtonElement) {
  button.dataset.moving = 'true';
  const all = Array.from(button.closest('.old-pages')?.querySelectorAll<HTMLButtonElement>('.move-today') ?? []);
  const i = all.indexOf(button);
  const waiting = (b: HTMLButtonElement) => !b.dataset.moving;
  const target = all.slice(i + 1).find(waiting) ?? all.slice(0, i).reverse().find(waiting) ?? document.getElementById('week-heading');
  target?.focus();
}

// Earlier days' unfinished lines, listed under the week, newest first.
// Lines can be crossed off, dragged out or sent to today with >, never added to or edited.
export function OldPages({ pages, today }: { pages: OldPage[]; today: string }) {
  const [confirmDay, setConfirmDay] = useState<string | null>(null);
  const coarse = usePointerCoarse();
  const { setNodeRef } = useDroppable({ id: OLD_DROP_ID, data: { list: 'old' } });
  if (pages.length === 0) return null;

  return (
    <section className="old-pages" aria-label="Old pages" ref={setNodeRef}>
      {pages.map((page) => {
        const open = page.lines.filter((l) => !l.done && !isHeading(l.text)).length;
        const confirming = confirmDay === page.day;
        // Binning can't be undone, so a page with open lines takes a second tap.
        function handleBin() {
          if (open > 0 && !confirming) setConfirmDay(page.day);
          else void binPage(page.day);
        }
        return (
          <article key={page.day} className="old-page" data-done={isPageDone(page.lines)}>
            <header>
              <h3>{pageTitle(page.day, today)}</h3>
              <button type="button" className="old-bin" data-confirm={confirming} onClick={handleBin}>
                {confirming ? `bin ${open} open line${open === 1 ? '' : 's'}?` : 'bin page'}
              </button>
            </header>
            <SortableContext items={page.lines.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <ol className="lines">
                {page.lines.map((line) => (
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
                    onMoveToday={(button) => {
                      focusAfterMove(button);
                      void pageLineToTodayEnd(line.id, today);
                    }}
                  />
                ))}
              </ol>
            </SortableContext>
          </article>
        );
      })}
    </section>
  );
}
