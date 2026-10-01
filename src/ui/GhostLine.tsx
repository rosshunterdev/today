import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export interface GhostLineProps {
  indent: 0 | 1;
  placeholder: string;
  focusRequested: boolean;
  onFocusHandled: () => void;
  onFocusChange: (focused: boolean) => void;
  onIndent: (indent: 0 | 1) => void;
  onCommit: (text: string) => void;
  onBackspaceEmpty: () => void;
}

// The always-present writing line at the bottom of the page.
export function GhostLine(props: GhostLineProps) {
  const { indent, placeholder, focusRequested, onFocusHandled, onFocusChange, onIndent, onCommit, onBackspaceEmpty } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!focusRequested) return;
    inputRef.current?.focus();
    onFocusHandled();
  }, [focusRequested, onFocusHandled]);

  function commit() {
    if (text.trim() === '') return;
    onCommit(text);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onIndent(e.shiftKey ? 0 : 1);
    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      if (indent === 1) onIndent(0);
      else onBackspaceEmpty();
    }
  }

  return (
    <li className="line ghost" data-indent={indent}>
      <input
        ref={inputRef}
        className="line-text"
        aria-label="New task"
        enterKeyHint="next"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => onFocusChange(true)}
        onBlur={() => {
          commit();
          onFocusChange(false);
        }}
      />
    </li>
  );
}
