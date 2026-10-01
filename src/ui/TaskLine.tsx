import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Task } from '../model';

export interface TaskLineProps {
  task: Task;
  focusRequested: boolean;
  onFocusHandled: () => void;
  onFocusChange: (focused: boolean) => void;
  onText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onIndent: (indent: 0 | 1) => void;
}

export function TaskLine(props: TaskLineProps) {
  const { task, focusRequested, onFocusHandled, onFocusChange, onText, onEnter, onBackspaceEmpty, onIndent } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(task.text);

  // Take outside changes (e.g. another tab) only while not being typed in.
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

  return (
    <li className="line" data-indent={task.indent} data-done={task.done}>
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
    </li>
  );
}
