import { useToday } from './ui/useToday';
import { DayHeader } from './ui/DayHeader';
import { LeftoversNote } from './ui/LeftoversNote';
import { NotebookPage } from './ui/NotebookPage';
import { DragBoard } from './ui/DragBoard';
import { weekOf } from './day/week';

export function App() {
  const today = useToday();
  const week = weekOf(today);
  return (
    <DragBoard day={today} week={week}>
      <main className="page">
        <DayHeader day={today} />
        <LeftoversNote today={today} />
        <NotebookPage day={today} />
      </main>
    </DragBoard>
  );
}
