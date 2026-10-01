// Matches @dnd-kit arrayMove: active ends up where `over` was.
export function neighboursAfterMove(
  ids: string[],
  activeId: string,
  overId: string,
): { prevId: string | null; nextId: string | null } {
  const moved = ids.filter((id) => id !== activeId);
  moved.splice(ids.indexOf(overId), 0, activeId);
  const i = moved.indexOf(activeId);
  return { prevId: moved[i - 1] ?? null, nextId: moved[i + 1] ?? null };
}
