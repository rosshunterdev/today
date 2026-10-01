import { useToday } from './ui/useToday';
import { DayHeader } from './ui/DayHeader';
import { LeftoversNote } from './ui/LeftoversNote';
import { NotebookPage } from './ui/NotebookPage';

export function App() {
  const today = useToday();
  return (
    <main className="page">
      <DayHeader day={today} />
      <LeftoversNote today={today} />
      <NotebookPage day={today} />
    </main>
  );
}
