import { closestCenter, pointerWithin, type Collision, type CollisionDetection, type UniqueIdentifier } from '@dnd-kit/core';
import { neighboursAfterMove } from './reorder';

export type ListId = 'today' | 'tomorrow' | 'week';
// Where a dragged line can come from. Old page lines can be dragged out but never dropped onto.
export type LineSource = ListId | 'old';
// The folded corners turn between today's side and the week's side on phones. Tomorrow is on today's side, so it has none.
export type CornerList = 'today' | 'week';

export const LIST_DROP_ID: Record<ListId, string> = { today: 'list:today', tomorrow: 'list:tomorrow', week: 'list:week' };
// The folded page corners on phones. A line dropped on one goes to the end of that list.
export const CORNER_ID: Record<CornerList, string> = { today: 'corner:today', week: 'corner:week' };
export const OLD_DROP_ID = 'list:old';
// The bin. A line dropped in it is thrown away (a soft delete, with an undo).
export const BIN_ID = 'bin';

const LISTS: ListId[] = ['today', 'tomorrow', 'week'];
// Lists that lie over another drop target (Tomorrow inside today's page, the week note on the desk):
// while the pointer is on one, only its own targets count.
const INNER: ListId[] = ['tomorrow', 'week'];
const CORNERS = new Set<UniqueIdentifier>([CORNER_ID.today, CORNER_ID.week]);
const CONTAINERS = new Set<UniqueIdentifier>([
  LIST_DROP_ID.today,
  LIST_DROP_ID.tomorrow,
  LIST_DROP_ID.week,
  CORNER_ID.today,
  CORNER_ID.week,
  OLD_DROP_ID,
  BIN_ID,
]);

export type Drop =
  | { kind: 'none' }
  | { kind: 'reorder'; list: ListId; id: string; prevId: string | null; nextId: string | null }
  | { kind: 'transfer'; from: LineSource; to: ListId; id: string; prevId: string | null; nextId: string | null }
  | { kind: 'bin'; from: LineSource; id: string };

const NONE: Drop = { kind: 'none' };

function targetOf(overId: string, lists: Record<ListId, string[]>): { list: ListId; index: number | null } | null {
  if (overId === LIST_DROP_ID.today || overId === CORNER_ID.today) return { list: 'today', index: null };
  if (overId === LIST_DROP_ID.tomorrow) return { list: 'tomorrow', index: null };
  if (overId === LIST_DROP_ID.week || overId === CORNER_ID.week) return { list: 'week', index: null };
  for (const list of LISTS) {
    const index = lists[list].indexOf(overId);
    if (index >= 0) return { list, index };
  }
  return null;
}

// What a drop means, from the ids of both lists in their current order.
// On a line in the other list the item lands in front of it; on the list itself (or its corner) it goes last.
export function resolveDrop(lists: Record<ListId, string[]>, activeId: string, overId: string | null, old: string[] = []): Drop {
  const from: LineSource | undefined = old.includes(activeId) ? 'old' : LISTS.find((list) => lists[list].includes(activeId));
  if (!from || overId === null || overId === activeId) return NONE;
  if (overId === BIN_ID) return { kind: 'bin', from, id: activeId };
  const target = targetOf(overId, lists);
  if (!target) return NONE;
  const ids = lists[target.list];
  if (target.list === from) {
    if (target.index === null) return NONE;
    return { kind: 'reorder', list: from, id: activeId, ...neighboursAfterMove(ids, activeId, overId) };
  }
  if (target.index === null) {
    return { kind: 'transfer', from, to: target.list, id: activeId, prevId: ids[ids.length - 1] ?? null, nextId: null };
  }
  return { kind: 'transfer', from, to: target.list, id: activeId, prevId: ids[target.index - 1] ?? null, nextId: ids[target.index] };
}

// Pointer first, so the line under the finger wins over the list around it.
// The bin and the folded corners float over the pages, so a drop on one means that, whatever lies underneath.
// Over the old pages there is no target: a drop there means nothing.
// While the pointer is on Tomorrow or the week, only that list's targets count.
// A Tomorrow line let go on today's paper below Tomorrow means nothing: on paper, everything under that heading is tomorrow's.
// Off every target (blank desk) there is no target, so the drop writes nothing.
// Keyboard drags have no pointer: they use the nearest line in the item's own list.
export const collide: CollisionDetection = (args) => {
  const own = args.active.data.current?.list;
  if (!args.pointerCoordinates) {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => !CONTAINERS.has(c.id) && c.data.current?.list === own),
    });
  }
  const listOf = (id: UniqueIdentifier) => args.droppableContainers.find((c) => c.id === id)?.data.current?.list as ListId | undefined;
  const within = pointerWithin(args);
  const bin = within.find((c) => c.id === BIN_ID);
  if (bin) return [bin];
  const corner = within.find((c) => CORNERS.has(c.id));
  if (corner) return [corner];
  if (within.some((c) => c.id === OLD_DROP_ID)) return [];
  const inner = INNER.find((list) => within.some((c) => CONTAINERS.has(c.id) && listOf(c.id) === list));
  const candidates: Collision[] = inner ? within.filter((c) => listOf(c.id) === inner) : within;
  const lines = candidates.filter((c) => !CONTAINERS.has(c.id));
  if (lines.length > 0) return lines;
  const tomorrow = args.droppableRects.get(LIST_DROP_ID.tomorrow);
  if (own === 'tomorrow' && !inner && tomorrow && args.pointerCoordinates.y > tomorrow.bottom) return [];
  return candidates;
};
