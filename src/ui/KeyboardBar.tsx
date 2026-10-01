import type { MouseEvent } from 'react';
import { useKeyboardOffset } from './useKeyboardOffset';

export function KeyboardBar({ onIndent }: { onIndent: (indent: 0 | 1) => void }) {
  const offset = useKeyboardOffset();
  // preventDefault on mousedown keeps focus (and the keyboard) on the line being edited.
  const keepFocus = (e: MouseEvent) => e.preventDefault();
  return (
    <div className="kbd-bar" role="toolbar" aria-label="Line tools" style={{ translate: `0 ${-offset}px` }}>
      <button type="button" aria-label="Undo sub-step" onMouseDown={keepFocus} onClick={() => onIndent(0)}>
        ⇤
      </button>
      <button type="button" aria-label="Make sub-step" onMouseDown={keepFocus} onClick={() => onIndent(1)}>
        ⇥
      </button>
    </div>
  );
}
