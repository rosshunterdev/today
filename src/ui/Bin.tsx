import { useDndContext, useDroppable } from '@dnd-kit/core';
import { BIN_ID } from '../order/drop';
import { BinIcon } from './icons';

// The bin: drop a line in it to throw it away. Always there on wide screens; on phones it shows while a line is lifted.
// It is only a drop target, never a button, so screen readers skip it.
export function Bin() {
  const { setNodeRef, isOver } = useDroppable({ id: BIN_ID });
  const { active } = useDndContext();
  return (
    <div ref={setNodeRef} className="bin" data-target={active !== null} data-over={isOver} aria-hidden="true">
      <BinIcon />
    </div>
  );
}
