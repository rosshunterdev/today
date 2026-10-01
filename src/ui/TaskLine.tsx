import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { Task } from '../model';
import { isStrike } from './stroke';
import { MARK_GLYPH } from '../marks';

export interface TaskLineProps {
  task: Task;
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
  const { task, focusRequested, onFocusHandled, onFocusChange, onText, onEnter, onBackspaceEmpty, onIndent, onToggleDone, onCycleMark } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(task.text);
  const [textWidth, setTextWidth] = useState(0);

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
  function onPointerDown(e: ReactPointerEvent<HTMLLIElement>) {
    const startX = e.clientX;
    const startY = e.clientY;
    const width = e.currentTarget.getBoundingClientRect().width;
    const onUp = (up: PointerEvent) => {
      window.removeEventListener('pointerup', onUp);
      if (!isStrike(up.clientX - startX, up.clientY - startY, width)) return;
      onToggleDone();
      inputRef.current?.blur();
      window.getSelection()?.removeAllRanges();
    };
    window.addEventListener('pointerup', onUp);
  }

  return (
    <li className="line" data-indent={task.indent} data-done={task.done} onPointerDown={onPointerDown}>
      <button type="button" className="mark" aria-label={`Mark: ${task.mark ?? 'none'}`} onClick={onCycleMark}>
        {task.mark ? MARK_GLYPH[task.mark] : ''}
      </button>
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
