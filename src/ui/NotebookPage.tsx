import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addTask, deleteTask, listDay, setDone, setIndent, setMark, updateText } from '../store/tasks';
import { nextMark } from '../marks';
import { TaskLine } from './TaskLine';
import { GhostLine } from './GhostLine';

export const GHOST = 'ghost';

export function NotebookPage({ day }: { day: string }) {
  const tasks = useLiveQuery(() => listDay(day), [day]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ghostIndent, setGhostIndent] = useState<0 | 1>(0);
  const clearFocus = useCallback(() => setFocusId(null), []);

  if (!tasks) return null;

  const trackFocus = (id: string) => (focused: boolean) =>
    setActiveId((current) => (focused ? id : current === id ? null : current));

  async function handleEnter(index: number) {
    const task = tasks![index];
    if (index === tasks!.length - 1) {
      setFocusId(GHOST);
      return;
    }
    const created = await addTask(day, { afterId: task.id, indent: task.indent });
    setFocusId(created.id);
  }

  async function handleBackspaceEmpty(index: number) {
    await deleteTask(tasks![index].id);
    setFocusId(tasks![index - 1]?.id ?? GHOST);
  }

  function handleGhostBackspace() {
    const last = tasks![tasks!.length - 1];
    if (last) setFocusId(last.id);
  }

  return (
    <ol className="lines">
      {tasks.map((task, i) => (
        <TaskLine
          key={task.id}
          task={task}
          focusRequested={focusId === task.id}
          onFocusHandled={clearFocus}
          onFocusChange={trackFocus(task.id)}
          onText={(text) => void updateText(task.id, text)}
          onEnter={() => void handleEnter(i)}
          onBackspaceEmpty={() => void handleBackspaceEmpty(i)}
          onIndent={(indent) => void setIndent(task.id, indent)}
          onToggleDone={() => void setDone(task.id, !task.done)}
          onCycleMark={() => void setMark(task.id, nextMark(task.mark))}
        />
      ))}
      <GhostLine
        indent={ghostIndent}
        placeholder={tasks.length === 0 ? "what's on today?" : ''}
        focusRequested={focusId === GHOST}
        onFocusHandled={clearFocus}
        onFocusChange={trackFocus(GHOST)}
        onIndent={setGhostIndent}
        onCommit={(text) => void addTask(day, { text, indent: ghostIndent })}
        onBackspaceEmpty={handleGhostBackspace}
      />
    </ol>
  );
}
