import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DndContext, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { addDays, dayMarks, dayTitle, monthGrid, monthOf, monthTitle, relativeDay, shiftMonth } from '../day/calendar';
import { dayToDate, nextDay } from '../day/logicalDay';
import { hasNotes } from '../day/leftovers';
import { weekOf } from '../day/week';
import { isHeading } from '../heading';
import { listBetween, listDay, setDone } from '../store/tasks';
import { pageLineToTodayEnd } from '../store/pages';
import { Bin } from './Bin';
import { DragBoard } from './DragBoard';
import { NotebookPage } from './NotebookPage';
import { TaskLine } from './TaskLine';
import { usePointerCoarse } from './usePointerCoarse';
import { ChevronIcon } from './icons';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// A cell is a small copy of its day's list: one ring per line. A longer day shows its first rings and "+n" in the last place.
const MAX_MARKS = 4;
const STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const noop = () => {};
const count = (n: number, word: string) => `${n} ${word}`;

// The calendar: a month on one side, the picked day's lines on the other.
// A line written on a coming day is an ordinary task dated that day, so it is simply on today's page when the day arrives.
export function CalendarView({ today }: { today: string }) {
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => monthOf(today));
  const weeks = monthGrid(month);
  const from = weeks[0][0];
  const to = weeks[weeks.length - 1][6];
  const tasks = useLiveQuery(() => listBetween(from, to), [from, to]);
  const marks = dayMarks(tasks ?? []);
  const grid = useRef<HTMLDivElement>(null);
  const followFocus = useRef(false);

  // After an arrow key the cursor follows the picked day, into the next month if it has to.
  useEffect(() => {
    if (!followFocus.current) return;
    followFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  }, [selected]);

  function pick(day: string) {
    setSelected(day);
    setMonth(monthOf(day));
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = STEP[e.key];
    if (!step) return;
    e.preventDefault();
    followFocus.current = true;
    pick(addDays(selected, step));
  }

  function turn(by: number) {
    setMonth((m) => shiftMonth(m, by));
  }

  return (
    <div className="book calendar">
      <main className="page cal-month">
        <header className="cal-head">
          <h1>{monthTitle(month)}</h1>
          <div className="cal-turn">
            <button type="button" className="cal-today" onClick={() => pick(today)}>
              Go to today
            </button>
            <button type="button" className="cal-arrow" data-dir="back" aria-label="Month before" onClick={() => turn(-1)}>
              <ChevronIcon />
            </button>
            <button type="button" className="cal-arrow" aria-label="Month after" onClick={() => turn(1)}>
              <ChevronIcon />
            </button>
          </div>
        </header>
        <div className="cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid" role="group" aria-label={monthTitle(month)} ref={grid} onKeyDown={onKeyDown}>
          {weeks.flat().map((day) => {
            const lines = marks.get(day) ?? [];
            const done = lines.filter(Boolean).length;
            const open = lines.length - done;
            const summary = lines.length === 0 ? '' : `, ${count(open, 'to do')}, ${count(done, 'done')}`;
            const rings = lines.length > MAX_MARKS ? lines.slice(0, MAX_MARKS - 1) : lines;
            // The picked day is the one stop in the tab order; when it's in another month, the first of this one stands in.
            const tabStop = monthOf(selected) === month ? selected : `${month}-01`;
            return (
              <button
                key={day}
                type="button"
                className="cal-cell"
                data-outside={monthOf(day) !== month || undefined}
                data-past={day < today || undefined}
                aria-pressed={day === selected}
                aria-current={day === today ? 'date' : undefined}
                aria-label={`${dayTitle(day)}${summary}`}
                tabIndex={day === tabStop ? 0 : -1}
                onClick={() => pick(day)}
              >
                <span className="cal-number">{dayToDate(day).getDate()}</span>
                <span className="cal-marks">
                  {rings.map((isDone, i) => (
                    <span key={i} className="cal-mark" data-done={isDone} />
                  ))}
                  {lines.length > rings.length && <span className="cal-more">+{lines.length - rings.length}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </main>
      <section className="page more-page cal-day" aria-labelledby="cal-day-heading">
        <header className="week-header">
          {/* tabIndex -1: focus lands here when a past line is sent to today and leaves the list. */}
          <h2 id="cal-day-heading" tabIndex={-1}>
            {dayTitle(selected)}
          </h2>
          <p className="week-dates">{relativeDay(selected, today)}</p>
        </header>
        {selected < today ? <PastDay key={selected} day={selected} today={today} /> : <OpenDay key={selected} day={selected} today={today} />}
      </section>
    </div>
  );
}

// Today or a coming day: written, reordered and binned exactly like today's page.
function OpenDay({ day, today }: { day: string; today: string }) {
  const placeholder = day === today ? "what's on today?" : day === nextDay(today) ? "what's on tomorrow?" : "what's on this day?";
  return (
    <DragBoard day={day} tomorrow={nextDay(day)} week={weekOf(day)}>
      <NotebookPage day={day} placeholder={placeholder} startFocus={false} />
      <Bin />
    </DragBoard>
  );
}

// A day gone by: its lines as they were left. They can be crossed off or sent to today with >, like an old page, never edited.
function PastDay({ day, today }: { day: string; today: string }) {
  const lines = useLiveQuery(() => listDay(day), [day]);
  const coarse = usePointerCoarse();
  // The lines need a drag context around them, but nothing here is dragged: no sensors, so no drag ever starts.
  const sensors = useSensors();
  if (!lines) return null;
  const written = lines.filter((l) => l.text.trim() !== '' || hasNotes(l.notes));
  if (written.length === 0) return <p className="cal-empty">Nothing was written on this day.</p>;

  return (
    <DndContext sensors={sensors}>
      <SortableContext items={written.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ol className="lines cal-past">
          {written.map((line) => (
            <TaskLine
              key={line.id}
              task={line}
              list="old"
              label="Past task"
              readOnly
              coarse={coarse}
              focusRequested={false}
              onFocusHandled={noop}
              onFocusChange={noop}
              onText={noop}
              onEnter={noop}
              onBackspaceEmpty={noop}
              onToggleDone={() => void setDone(line.id, !line.done)}
              onMoveToday={
                line.done || isHeading(line.text)
                  ? undefined
                  : () => {
                      document.getElementById('cal-day-heading')?.focus();
                      void pageLineToTodayEnd(line.id, today);
                    }
              }
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
