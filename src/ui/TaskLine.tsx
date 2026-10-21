import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type TouchEventHandler } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Mark } from '../model';
import type { LineSource } from '../order/drop';
import { isStrike } from './stroke';
import { MARK_GLYPH } from '../marks';
import { hasNotes } from '../day/leftovers';
import { CrossIcon, DragDotsIcon, PencilIcon } from './icons';

export interface LineItem {
  id: string;
  text: string;
  done: boolean;
  indent?: 0 | 1;
  mark?: Mark;
  notes?: string;
}

export interface TaskLineProps {
  task: LineItem;
  list: LineSource;
  label?: string;
  readOnly?: boolean; // old page lines: cross off and drag out only
  coarse: boolean;
  focusRequested: boolean;
  onFocusHandled: () => void;
  onFocusChange: (focused: boolean) => void;
  onText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onIndent?: (indent: 0 | 1) => void;
  onToggleDone: () => void;
  onCycleMark?: () => void;
  onNotes?: (notes: string) => void;
  onMoveToday?: (button: HTMLButtonElement) => void; // old page lines: the > that sends the line to the end of today
}

export function TaskLine(props: TaskLineProps) {
  const { task, list, label = 'Task', readOnly = false, coarse, focusRequested, onFocusHandled, onFocusChange, onText, onEnter, onBackspaceEmpty, onIndent, onToggleDone, onCycleMark, onNotes, onMoveToday } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(task.text);
  const [textWidth, setTextWidth] = useState(0);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [notes, setNotesText] = useState(task.notes ?? '');
  const [notesOpen, setNotesOpen] = useState(false);
  const noted = hasNotes(notes);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { list, text: task.text },
    // Old page lines can be picked up but nothing can be dropped onto them.
    disabled: readOnly ? { draggable: false, droppable: true } : undefined,
  });
  const draggingRef = useRef(false);
  draggingRef.current = isDragging;

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(task.text);
  }, [task.text]);

  useEffect(() => {
    if (document.activeElement !== notesRef.current) setNotesText(task.notes ?? '');
  }, [task.notes]);

  // Grow the note one ruled line at a time as it's written.
  useLayoutEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, [notes, notesOpen]);

  useEffect(() => {
    if (!focusRequested) return;
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    onFocusHandled();
  }, [focusRequested, onFocusHandled]);

  useLayoutEffect(() => {
    setTextWidth(measureRef.current?.offsetWidth ?? 0);
  }, [text, task.indent]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    } else if (e.key === 'Tab' && onIndent) {
      e.preventDefault();
      onIndent(e.shiftKey ? 0 : 1);
    } else if (e.key === 'Backspace' && text === '' && !noted) {
      e.preventDefault();
      onBackspaceEmpty();
    }
  }

  // Listen for the release on window so a stroke that drifts off the line still counts.
  // pointercancel (the browser took over to scroll) ends the stroke without a strike.
  function onPointerDown(e: ReactPointerEvent<HTMLLIElement>) {
    // With a mouse, dragging inside the line being edited is text selection, not a strike.
    if (e.pointerType === 'mouse' && document.activeElement === inputRef.current && e.target === inputRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const width = e.currentTarget.getBoundingClientRect().width;
    const end = () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', end);
    };
    const onUp = (up: PointerEvent) => {
      end();
      if (draggingRef.current) return;
      if (!isStrike(up.clientX - startX, up.clientY - startY, width)) return;
      onToggleDone();
      inputRef.current?.blur();
      window.getSelection()?.removeAllRanges();
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', end);
  }

  return (
    <li
      ref={setNodeRef}
      className="line"
      data-indent={task.indent ?? 0}
      data-done={task.done}
      data-mark={task.mark ?? undefined}
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onPointerDown={onPointerDown}
      onTouchStart={coarse ? (listeners?.onTouchStart as TouchEventHandler<HTMLLIElement> | undefined) : undefined}
    >
      {onCycleMark && (
        <button type="button" className="mark" aria-label={`Mark: ${task.mark ?? 'none'}`} onClick={onCycleMark}>
          {task.mark ? MARK_GLYPH[task.mark] : ''}
        </button>
      )}
      {readOnly && task.mark && (
        <span className="mark" role="img" aria-label={`Mark: ${task.mark}`}>
          {MARK_GLYPH[task.mark]}
        </span>
      )}
      {!coarse && (
        <button type="button" className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label="Reorder">
          <DragDotsIcon />
        </button>
      )}
      <div className="ink">
        {/* The single-click way to cross off: the stroke is a gesture, and not everyone can make one. */}
        <button
          type="button"
          className="bullet"
          aria-label={`Cross off ${text.trim() || 'line'}`}
          aria-pressed={task.done}
          onClick={() => {
            onToggleDone();
            inputRef.current?.blur();
          }}
        >
          {task.done ? <CrossIcon /> : <span className="dot" />}
        </button>
        {task.mark === 'star' && <span className="star" style={{ width: textWidth + 6 }} aria-hidden="true" />}
        <input
          ref={inputRef}
          className="line-text"
          aria-label={label}
          readOnly={readOnly}
          enterKeyHint="next"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onText(e.target.value);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        />
        <span ref={measureRef} className="measure" aria-hidden="true">
          {text}
        </span>
        {task.done && (
          <svg className="strike" style={{ width: textWidth + 4 }} viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
            <path d="M1 5.2 C30 4.6, 62 5.6, 99 4.8" pathLength={1} />
          </svg>
        )}
      </div>
      {onMoveToday && (
        <button
          type="button"
          className="move-today"
          aria-label={`Move ${task.text.trim() || 'line'} to today`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => onMoveToday(e.currentTarget)}
        >
          &gt;
        </button>
      )}
      {(onNotes || (readOnly && noted)) && (
        <button
          type="button"
          ref={toggleRef}
          className="notes-toggle"
          aria-label="Notes"
          aria-expanded={notesOpen}
          data-has={noted}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setNotesOpen((open) => !open)}
        >
          <PencilIcon />
        </button>
      )}
      {notesOpen && (
        // Strokes and drags start from the line row only, never from the note.
        <div className="notes-wrap" onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <span className="notes-dash" aria-hidden="true">
            –
          </span>
          <textarea
            ref={notesRef}
            className="notes"
            aria-label="Notes"
            rows={1}
            value={notes}
            readOnly={readOnly}
            autoFocus={!readOnly}
            onChange={(e) => {
              setNotesText(e.target.value);
              onNotes?.(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setNotesOpen(false);
                toggleRef.current?.focus();
              }
            }}
          />
        </div>
      )}
    </li>
  );
}
