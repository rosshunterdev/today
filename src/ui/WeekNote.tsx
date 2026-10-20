import { useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDroppable } from '@dnd-kit/core';
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
import { weekLeftoversLabel, weekRange } from '../day/week';
import { LIST_DROP_ID } from '../order/drop';
import { TaskLine } from './TaskLine';
import { GhostLine } from './GhostLine';
import { CarryOverNote } from './CarryOverNote';
import { usePointerCoarse } from './usePointerCoarse';

const GHOST = 'goal-ghost';
const noop = () => {};

// This week: the top of the right-hand page, or the second page on phones.
export function WeekNote({ week }: { week: string }) {
  const goals = useLiveQuery(() => listWeek(week), [week]);
  const leftovers = useLiveQuery(() => findWeekLeftovers(week), [week]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const clearFocus = useCallback(() => setFocusId(null), []);
  const coarse = usePointerCoarse();
  const { setNodeRef } = useDroppable({ id: LIST_DROP_ID.week, data: { list: 'week' } });

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

  const leftoversLabel = leftovers ? weekLeftoversLabel(leftovers.week, week) : '';

  return (
    <section className="week-note" aria-label="This week" ref={setNodeRef}>
      <header className="week-header">
        {/* tabIndex -1: focus lands here when a phone turns to this page. */}
        <h2 id="week-heading" tabIndex={-1}>
          This week
        </h2>
        <p className="week-dates">{weekRange(week)}</p>
      </header>
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
  );
}
