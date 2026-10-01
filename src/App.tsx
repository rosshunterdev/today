import { useToday } from './ui/useToday';
import { DayHeader } from './ui/DayHeader';

export function App() {
  const today = useToday();
  return (
    <main className="page">
      <DayHeader day={today} />
    </main>
  );
}
