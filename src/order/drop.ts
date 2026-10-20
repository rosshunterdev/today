import { closestCenter, pointerWithin, type Collision, type CollisionDetection, type UniqueIdentifier } from '@dnd-kit/core';
import { neighboursAfterMove } from './reorder';

export type ListId = 'today' | 'week';
// Where a dragged line can come from. Old page lines can be dragged out but never dropped onto.
export type LineSource = ListId | 'old';

export const LIST_DROP_ID: Record<ListId, string> = { today: 'list:today', week: 'list:week' };
export const WEEK_TAB_ID = 'week-tab';
export const OLD_DROP_ID = 'list:old';

const LISTS: ListId[] = ['today', 'week'];
const CONTAINERS = new Set<UniqueIdentifier>([LIST_DROP_ID.today, LIST_DROP_ID.week, WEEK_TAB_ID, OLD_DROP_ID]);

export type Drop =
  | { kind: 'none' }
  | { kind: 'reorder'; list: ListId; id: string; prevId: string | null; nextId: string | null }
  | { kind: 'transfer'; from: LineSource; to: ListId; id: string; prevId: string | null; nextId: string | null };

const NONE: Drop = { kind: 'none' };

function targetOf(overId: string, lists: Record<ListId, string[]>): { list: ListId; index: number | null } | null {
  if (overId === LIST_DROP_ID.today) return { list: 'today', index: null };
  if (overId === LIST_DROP_ID.week || overId === WEEK_TAB_ID) return { list: 'week', index: null };
  for (const list of LISTS) {
    const index = lists[list].indexOf(overId);
    if (index >= 0) return { list, index };
  }
  return null;
}

// What a drop means, from the ids of both lists in their current order.
// On a line in the other list the item lands in front of it; on the list itself (or the phone tab) it goes last.
export function resolveDrop(lists: Record<ListId, string[]>, activeId: string, overId: string | null, old: string[] = []): Drop {
  const from: LineSource | undefined = old.includes(activeId) ? 'old' : LISTS.find((list) => lists[list].includes(activeId));
  if (!from || overId === null || overId === activeId) return NONE;
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
// The phone note sits on top of today's lines, so while the pointer is on the week, only week targets count.
// Off every target (blank desk) there is no target, so the drop writes nothing.
// Over the old pages stack there is no target either.
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
  // The old pages stack can sit over today's lines on phones; a drop there means nothing.
  if (within.some((c) => c.id === OLD_DROP_ID)) return [];
  const onWeek = within.some((c) => CONTAINERS.has(c.id) && listOf(c.id) === 'week');
  const candidates: Collision[] = onWeek ? within.filter((c) => listOf(c.id) === 'week') : within;
  const lines = candidates.filter((c) => !CONTAINERS.has(c.id));
  if (lines.length > 0) return lines;
  return candidates;
};
