import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type TouchEventHandler } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../model';
import { isStrike } from './stroke';
import { MARK_GLYPH } from '../marks';

export interface TaskLineProps {
  task: Task;
  coarse: boolean;
  focusRequested: boolean;
  onFocusHandled: () => void;
  onFocusChange: (focused: boolean) => void;
  onText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onIndent: (indent: 0 | 1) => void;
  onToggleDone: () => void;
  onCycleMark: () => void;
}

export function TaskLine(props: TaskLineProps) {
  const { task, coarse, focusRequested, onFocusHandled, onFocusChange, onText, onEnter, onBackspaceEmpty, onIndent, onToggleDone, onCycleMark } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(task.text);
  const [textWidth, setTextWidth] = useState(0);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const draggingRef = useRef(false);
  draggingRef.current = isDragging;

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(task.text);
  }, [task.text]);

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
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onIndent(e.shiftKey ? 0 : 1);
    } else if (e.key === 'Backspace' && text === '') {
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
      data-indent={task.indent}
      data-done={task.done}
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onPointerDown={onPointerDown}
      onTouchStart={coarse ? (listeners?.onTouchStart as TouchEventHandler<HTMLLIElement> | undefined) : undefined}
    >
      <button type="button" className="mark" aria-label={`Mark: ${task.mark ?? 'none'}`} onClick={onCycleMark}>
        {task.mark ? MARK_GLYPH[task.mark] : ''}
      </button>
      {!coarse && (
        <button type="button" className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label="Reorder">
          ⠿
        </button>
      )}
      <div className="ink">
        <input
          ref={inputRef}
          className="line-text"
          aria-label="Task"
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
          <svg className="strike" style={{ width: textWidth + 8 }} viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
            <path d="M1 6 C30 3, 60 8, 99 4" pathLength={1} />
          </svg>
        )}
      </div>
    </li>
  );
}
