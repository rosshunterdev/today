import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LineSource } from '../order/drop';
import { deleteTask, restoreTask } from '../store/tasks';
import { deleteGoal, restoreGoal } from '../store/goals';
import { UndoSlip } from './UndoSlip';

export interface BinnedLine {
  from: LineSource;
  id: string;
  text: string;
}

export interface BinApi {
  bin: (line: BinnedLine) => Promise<void>;
  undo: () => Promise<void>;
}

// How long the undo slip stays, unless the pointer or focus is on it.
export const SLIP_MS = 5000;

// Goals live in their own table; today's, Tomorrow's and old page lines are all tasks.
const remove = (line: BinnedLine) => (line.from === 'week' ? deleteGoal(line.id) : deleteTask(line.id));
const restore = (line: BinnedLine) => (line.from === 'week' ? restoreGoal(line.id) : restoreTask(line.id));

const BinContext = createContext<BinApi | null>(null);

// The one way to throw a line away, so every bin, by drag or by key, gets the undo slip.
export function BinProvider({ children }: { children: ReactNode }) {
  const [last, setLast] = useState<BinnedLine | null>(null);
  const [paused, setPaused] = useState(false);
  const lastRef = useRef(last);
  lastRef.current = last;

  const bin = useCallback(async (line: BinnedLine) => {
    await remove(line);
    // A slip removed from under the pointer or focus never hears it leave, so each bin starts unpaused.
    setPaused(false);
    setLast(line);
  }, []);

  const undo = useCallback(async () => {
    const line = lastRef.current;
    if (!line) return;
    setLast(null);
    await restore(line);
  }, []);

  // Each new bin starts the count again.
  useEffect(() => {
    if (!last || paused) return;
    const timer = setTimeout(() => setLast(null), SLIP_MS);
    return () => clearTimeout(timer);
  }, [last, paused]);

  // While the slip shows, Ctrl+Z (⌘Z) brings the line back instead of undoing typing.
  useEffect(() => {
    if (!last) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void undo();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [last, undo]);

  const api = useMemo(() => ({ bin, undo }), [bin, undo]);
  return (
    <BinContext.Provider value={api}>
      {children}
      <UndoSlip text={last?.text ?? null} onUndo={() => void undo()} onPause={setPaused} />
    </BinContext.Provider>
  );
}

export function useBin(): BinApi {
  const api = useContext(BinContext);
  if (!api) throw new Error('useBin must be used inside BinProvider');
  return api;
}
