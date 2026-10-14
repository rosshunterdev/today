import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { listDay, moveTask } from '../store/tasks';
import { goalToTask, listWeek, moveGoal, taskToGoal } from '../store/goals';
import { collide, resolveDrop } from '../order/drop';

// One drag context for today's page and the week note, so a line can move between them.
export function DragBoard({ day, week, children }: { day: string; week: string; children: ReactNode }) {
  const taskIds = useLiveQuery(async () => (await listDay(day)).map((t) => t.id), [day]) ?? [];
  const goalIds = useLiveQuery(async () => (await listWeek(week)).map((g) => g.id), [week]) ?? [];
  const [dragText, setDragText] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setDragText(String(active.data.current?.text ?? ''));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragText(null);
    const drop = resolveDrop({ today: taskIds, week: goalIds }, String(active.id), over ? String(over.id) : null);
    if (drop.kind === 'reorder') {
      void (drop.list === 'today' ? moveTask : moveGoal)(drop.id, drop.prevId, drop.nextId);
    } else if (drop.kind === 'transfer') {
      void (drop.to === 'week'
        ? taskToGoal(drop.id, week, drop.prevId, drop.nextId)
        : goalToTask(drop.id, day, drop.prevId, drop.nextId));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collide}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragText(null)}
    >
      {children}
      {/* Drawn above everything, so a line can leave the scrolling week note without being clipped. */}
      <DragOverlay dropAnimation={null}>
        {dragText !== null && (
          <div className="line drag-overlay">
            <span className="line-text">{dragText}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
