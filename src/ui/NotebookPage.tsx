import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { addTask, deleteTask, listDay, moveTask, setDone, setIndent, setMark, updateText } from '../store/tasks';
import { nextMark } from '../marks';
import { neighboursAfterMove } from '../order/reorder';
import { TaskLine } from './TaskLine';
import { GhostLine } from './GhostLine';
import { usePointerCoarse } from './usePointerCoarse';
import { KeyboardBar } from './KeyboardBar';

export const GHOST = 'ghost';

export function NotebookPage({ day }: { day: string }) {
  const tasks = useLiveQuery(() => listDay(day), [day]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ghostIndent, setGhostIndent] = useState<0 | 1>(0);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const coarse = usePointerCoarse();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const { prevId, nextId } = neighboursAfterMove(tasks!.map((t) => t.id), String(active.id), String(over.id));
    void moveTask(String(active.id), prevId, nextId);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ol className="lines">
          {tasks.map((task, i) => (
            <TaskLine
              key={task.id}
              task={task}
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
      </SortableContext>
      {coarse && activeId && <KeyboardBar onIndent={indentActive} />}
    </DndContext>
  );
}
