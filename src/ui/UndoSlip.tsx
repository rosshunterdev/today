// The slip after a bin: the line's words and an undo. The status region is always in the page,
// so screen readers announce each bin as it lands.
export function UndoSlip({ text, onUndo, onPause }: { text: string | null; onUndo: () => void; onPause: (paused: boolean) => void }) {
  const words = text?.trim() ?? '';
  return (
    <div className="slip-region" role="status">
      {text !== null && (
        <p
          className="slip"
          onPointerEnter={() => onPause(true)}
          onPointerLeave={() => onPause(false)}
          onFocus={() => onPause(true)}
          onBlur={() => onPause(false)}
        >
          <span className="slip-text">binned {words ? `“${words}”` : 'a line'}</span>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={onUndo}>
            undo
          </button>
        </p>
      )}
    </div>
  );
}
