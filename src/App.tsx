import { useEffect, useState, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToday } from './ui/useToday';
import { DayHeader } from './ui/DayHeader';
import { NotebookPage } from './ui/NotebookPage';
import { DragBoard } from './ui/DragBoard';
import { WeekNote } from './ui/WeekNote';
import { OldPages } from './ui/OldPages';
import { PageCorner } from './ui/PageCorner';
import { listOldPages } from './store/pages';
import { weekOf } from './day/week';
import { LIST_DROP_ID } from './order/drop';
import { Bin } from './ui/Bin';
import { BinProvider } from './ui/useBin';

type Side = 'today' | 'more';

export function App() {
  const today = useToday();
  const week = weekOf(today);
  const pages = useLiveQuery(() => listOldPages(today), [today]) ?? [];
  const [side, setSide] = useState<Side>('today');
  const [turned, setTurned] = useState(false);

  // After a turn, focus follows to the new page's heading, so keyboard and screen reader users land on it.
  useEffect(() => {
    if (turned) document.getElementById(side === 'more' ? 'week-heading' : 'today-heading')?.focus();
  }, [side, turned]);

  function turn(to: Side) {
    setSide(to);
    setTurned(true);
  }

  const n = pages.length;
  const moreLabel = n === 0 ? 'this week' : `this week and ${n} old page${n === 1 ? '' : 's'}`;

  return (
    <BinProvider>
      <DragBoard day={today} week={week}>
        {/* Wide screens show both pages as an open book; phones show one side at a time. */}
        <div className="book" data-side={side} data-turned={turned}>
          <TodayPage>
            <DayHeader day={today} />
            <NotebookPage day={today} />
            <PageCorner to="week" label={moreLabel} onTurn={() => turn('more')} />
          </TodayPage>
          <aside className="page more-page" aria-label="This week and old pages">
            <WeekNote week={week} />
            <OldPages pages={pages} today={today} />
            <PageCorner to="today" label="back to today" onTurn={() => turn('today')} />
          </aside>
          <Bin />
        </div>
      </DragBoard>
    </BinProvider>
  );
}

// The whole page is a drop target, so a goal dropped anywhere on the paper lands on today.
function TodayPage({ children }: { children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: LIST_DROP_ID.today, data: { list: 'today' } });
  return (
    <main className="page today-page" ref={setNodeRef}>
      {children}
    </main>
  );
}
