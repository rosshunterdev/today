import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { addTask, deleteTask, listDay, setDone, setIndent, setMark, setNotes, updateText } from '../store/tasks';
import { nextMark } from '../marks';
import { TaskLine } from './TaskLine';
import { GhostLine } from './GhostLine';
import { usePointerCoarse } from './usePointerCoarse';
import { KeyboardBar } from './KeyboardBar';
import type { ListId } from '../order/drop';

export const GHOST = 'ghost';

// Tomorrow's lines are named apart from today's, for screen readers and so each list's lines can be found on their own.
const NAMES = {
  today: { line: 'Task', ghost: 'New task' },
  tomorrow: { line: 'Tomorrow task', ghost: 'New tomorrow task' },
};

interface NotebookPageProps {
  day: string;
  list?: Extract<ListId, 'today' | 'tomorrow'>;
  placeholder?: string;
  // Whether the cursor starts in the writing line. Left out, it does on mouse/trackpad devices only:
  // phones can't raise the keyboard without a tap, so focusing there would only show the bar with no keyboard.
  startFocus?: boolean;
}

export function NotebookPage({ day, list = 'today', placeholder = "what's on today?", startFocus }: NotebookPageProps) {
  const tasks = useLiveQuery(() => listDay(day), [day]);
  const [focusId, setFocusId] = useState<string | null>(() =>
    (startFocus ?? !window.matchMedia('(pointer: coarse)').matches) ? GHOST : null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ghostIndent, setGhostIndent] = useState<0 | 1>(0);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const coarse = usePointerCoarse();

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

  function indentActive(indent: 0 | 1) {
    if (activeId === GHOST) setGhostIndent(indent);
    else if (activeId) void setIndent(activeId, indent);
  }

  return (
    <>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ol className="lines">
          {tasks.map((task, i) => (
            <TaskLine
              key={task.id}
              task={task}
              list={list}
              label={NAMES[list].line}
              coarse={coarse}
              focusRequested={focusId === task.id}
              onFocusHandled={clearFocus}
              onFocusChange={trackFocus(task.id)}
              onText={(text) => void updateText(task.id, text)}
              onEnter={() => void handleEnter(i)}
              onBackspaceEmpty={() => void handleBackspaceEmpty(i)}
              onIndent={(indent) => void setIndent(task.id, indent)}
              onToggleDone={() => void setDone(task.id, !task.done)}
              onCycleMark={() => void setMark(task.id, nextMark(task.mark))}
              onNotes={(notes) => void setNotes(task.id, notes)}
            />
          ))}
          <GhostLine
            indent={ghostIndent}
            label={NAMES[list].ghost}
            placeholder={tasks.length === 0 ? placeholder : ''}
            focusRequested={focusId === GHOST}
            onFocusHandled={clearFocus}
            onFocusChange={trackFocus(GHOST)}
            onIndent={setGhostIndent}
            onCommit={(text) => void addTask(day, { text, indent: ghostIndent })}
            onBackspaceEmpty={handleGhostBackspace}
          />
        </ol>
      </SortableContext>
      {coarse && activeId && <KeyboardBar onIndent={indentActive} />}
    </>
  );
}
