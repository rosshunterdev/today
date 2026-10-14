import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useToday } from './ui/useToday';
import { DayHeader } from './ui/DayHeader';
import { LeftoversNote } from './ui/LeftoversNote';
import { NotebookPage } from './ui/NotebookPage';
import { DragBoard } from './ui/DragBoard';
import { WeekNote } from './ui/WeekNote';
import { weekOf } from './day/week';
import { LIST_DROP_ID } from './order/drop';

export function App() {
  const today = useToday();
  const week = weekOf(today);
  return (
    <DragBoard day={today} week={week}>
      <TodayPage>
        <DayHeader day={today} />
        <LeftoversNote today={today} />
        <NotebookPage day={today} />
      </TodayPage>
      <WeekNote week={week} />
    </DragBoard>
  );
}

// The whole page is a drop target, so a goal dropped anywhere on the paper lands on today.
function TodayPage({ children }: { children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: LIST_DROP_ID.today, data: { list: 'today' } });
  return (
    <main className="page" ref={setNodeRef}>
      {children}
    </main>
  );
}
