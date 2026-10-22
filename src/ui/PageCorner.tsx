import { useDndContext, useDroppable } from '@dnd-kit/core';
import { CORNER_ID, type CornerList } from '../order/drop';
import { useKeyboardOffset } from './useKeyboardOffset';

// A folded page corner on phones: tap it to turn the page, or drop a line on it to send the line to the other page.
export function PageCorner({ to, label, onTurn }: { to: CornerList; label: string; onTurn: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: CORNER_ID[to], data: { list: to } });
  const { active } = useDndContext();
  const keyboard = useKeyboardOffset();
  const from = active?.data.current?.list;
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="corner"
      data-to={to}
      data-target={from !== undefined && from !== to}
      data-over={isOver}
      // Lifted above the on-screen keyboard, like the keyboard bar.
      style={keyboard > 0 ? { translate: `0 ${-keyboard}px` } : undefined}
      onClick={onTurn}
    >
      <span className="corner-label">{label}</span>
      <span className="corner-fold" aria-hidden="true" />
    </button>
  );
}
