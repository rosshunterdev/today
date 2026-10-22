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
import { listDay, moveTask, taskToDay } from '../store/tasks';
import { goalToTask, listWeek, moveGoal, taskToGoal } from '../store/goals';
import { listOldPages, pageLineToGoal } from '../store/pages';
import { collide, resolveDrop } from '../order/drop';
import { useBin } from './useBin';

// One drag context for today's page, Tomorrow, the week note and the old pages, so a line can move between them.
export function DragBoard({ day, tomorrow, week, children }: { day: string; tomorrow: string; week: string; children: ReactNode }) {
  const taskIds = useLiveQuery(async () => (await listDay(day)).map((t) => t.id), [day]) ?? [];
  const tomorrowIds = useLiveQuery(async () => (await listDay(tomorrow)).map((t) => t.id), [tomorrow]) ?? [];
  const goalIds = useLiveQuery(async () => (await listWeek(week)).map((g) => g.id), [week]) ?? [];
  const oldIds = useLiveQuery(async () => (await listOldPages(day)).flatMap((p) => p.lines.map((l) => l.id)), [day]) ?? [];
  const { bin } = useBin();
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
    const drop = resolveDrop({ today: taskIds, tomorrow: tomorrowIds, week: goalIds }, String(active.id), over ? String(over.id) : null, oldIds);
    if (drop.kind === 'bin') {
      void bin({ from: drop.from, id: drop.id, text: String(active.data.current?.text ?? '') });
    } else if (drop.kind === 'reorder') {
      void (drop.list === 'week' ? moveGoal : moveTask)(drop.id, drop.prevId, drop.nextId);
    } else if (drop.kind === 'transfer') {
      const { from, to, id, prevId, nextId } = drop;
      if (to === 'week') {
        void (from === 'old' ? pageLineToGoal : taskToGoal)(id, week, prevId, nextId);
      } else {
        // Today and Tomorrow are both days of tasks: a goal becomes a task there, any other line moves day.
        const target = to === 'today' ? day : tomorrow;
        void (from === 'week' ? goalToTask : taskToDay)(id, target, prevId, nextId);
      }
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
