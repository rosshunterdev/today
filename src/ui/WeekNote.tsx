import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  addGoal,
  bringOverGoals,
  deleteGoal,
  dismissWeekLeftovers,
  findWeekLeftovers,
  listWeek,
  setGoalDone,
  setGoalNotes,
  updateGoalText,
} from '../store/goals';
import { weekLeftoversLabel } from '../day/week';
import { LIST_DROP_ID, WEEK_TAB_ID } from '../order/drop';
import { TaskLine } from './TaskLine';
import { GhostLine } from './GhostLine';
import { CarryOverNote } from './CarryOverNote';
import { usePointerCoarse } from './usePointerCoarse';
import { useKeyboardOffset } from './useKeyboardOffset';

const GHOST = 'goal-ghost';
const noop = () => {};

// "This week" plus any old pages: a side column beside the page on wide screens, a tab that opens it on phones.
export function WeekNote({ week, oldCount = 0, children }: { week: string; oldCount?: number; children?: ReactNode }) {
  const goals = useLiveQuery(() => listWeek(week), [week]);
  const leftovers = useLiveQuery(() => findWeekLeftovers(week), [week]);
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const coarse = usePointerCoarse();
  const keyboard = useKeyboardOffset();
  const rootRef = useRef<HTMLDivElement>(null);
  const { active } = useDndContext();
  const { setNodeRef: setNoteRef } = useDroppable({ id: LIST_DROP_ID.week, data: { list: 'week' } });
  const { setNodeRef: setTabRef, isOver: overTab } = useDroppable({ id: WEEK_TAB_ID, data: { list: 'week' } });

  useEffect(() => {
    if (!open) return;
    const closeOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  if (!goals) return null;

  async function handleEnter(index: number) {
    if (index === goals!.length - 1) {
      setFocusId(GHOST);
      return;
    }
    const created = await addGoal(week, { afterId: goals![index].id });
    setFocusId(created.id);
  }

  async function handleBackspaceEmpty(index: number) {
    await deleteGoal(goals![index].id);
    setFocusId(goals![index - 1]?.id ?? GHOST);
  }

  function handleGhostBackspace() {
    const last = goals![goals!.length - 1];
    if (last) setFocusId(last.id);
  }

  const weekText = leftovers ? `Week · ${leftovers.goals.length} left` : `Week · ${goals.filter((g) => !g.done).length}`;
  const tabText = oldCount > 0 ? `${weekText} · ${oldCount} old` : weekText;
  const leftoversLabel = leftovers ? weekLeftoversLabel(leftovers.week, week) : '';
  const lift = keyboard > 0 ? { translate: `0 ${-keyboard}px` } : undefined;

  return (
    <div className="week" ref={rootRef} data-open={open}>
      <button
        type="button"
        ref={setTabRef}
        className="week-tab"
        aria-expanded={open}
        data-target={active?.data.current?.list === 'today' || active?.data.current?.list === 'old'}
        data-over={overTab}
        style={lift}
        onClick={() => setOpen((o) => !o)}
      >
        {tabText}
      </button>
      <div className="side" style={lift}>
        {children}
        <section className="week-note" aria-label="This week" ref={setNoteRef}>
          <h2>This week</h2>
          {leftovers && (
            <CarryOverNote
              label={leftoversLabel}
              fromLabel={leftoversLabel.charAt(0).toLowerCase() + leftoversLabel.slice(1)}
              items={leftovers.goals}
              onBring={(ids) => void bringOverGoals(week, ids)}
              onDismiss={() => void dismissWeekLeftovers(week)}
            />
          )}
          <SortableContext items={goals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <ol className="lines">
              {goals.map((goal, i) => (
                <TaskLine
                  key={goal.id}
                  task={goal}
                  list="week"
                  label="Goal"
                  coarse={coarse}
                  focusRequested={focusId === goal.id}
                  onFocusHandled={clearFocus}
                  onFocusChange={noop}
                  onText={(text) => void updateGoalText(goal.id, text)}
                  onEnter={() => void handleEnter(i)}
                  onBackspaceEmpty={() => void handleBackspaceEmpty(i)}
                  onToggleDone={() => void setGoalDone(goal.id, !goal.done)}
                  onNotes={(notes) => void setGoalNotes(goal.id, notes)}
                />
              ))}
              <GhostLine
                label="New goal"
                placeholder={goals.length === 0 ? 'add a goal' : ''}
                focusRequested={focusId === GHOST}
                onFocusHandled={clearFocus}
                onFocusChange={noop}
                onCommit={(text) => void addGoal(week, { text })}
                onBackspaceEmpty={handleGhostBackspace}
              />
            </ol>
          </SortableContext>
        </section>
      </div>
    </div>
  );
}
