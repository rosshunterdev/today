import { useEffect, useState } from 'react';
import { logicalDay } from '../day/logicalDay';

// Rechecks on focus, tab return, or a tap. Never mid-typing (no keydown), so a line isn't lost at 04:00.
export function useToday(): string {
  const [day, setDay] = useState(() => logicalDay(new Date()));
  useEffect(() => {
    const check = () => setDay(logicalDay(new Date()));
    window.addEventListener('focus', check);
    window.addEventListener('pointerdown', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      window.removeEventListener('pointerdown', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return day;
}
