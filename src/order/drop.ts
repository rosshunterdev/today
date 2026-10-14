import { closestCenter, pointerWithin, type Collision, type CollisionDetection, type UniqueIdentifier } from '@dnd-kit/core';
import { neighboursAfterMove } from './reorder';

export type ListId = 'today' | 'week';

export const LIST_DROP_ID: Record<ListId, string> = { today: 'list:today', week: 'list:week' };
export const WEEK_TAB_ID = 'week-tab';

const LISTS: ListId[] = ['today', 'week'];
const CONTAINERS = new Set<UniqueIdentifier>([LIST_DROP_ID.today, LIST_DROP_ID.week, WEEK_TAB_ID]);

export type Drop =
  | { kind: 'none' }
  | { kind: 'reorder'; list: ListId; id: string; prevId: string | null; nextId: string | null }
  | { kind: 'transfer'; from: ListId; to: ListId; id: string; prevId: string | null; nextId: string | null };

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
export function resolveDrop(lists: Record<ListId, string[]>, activeId: string, overId: string | null): Drop {
  const from = LISTS.find((list) => lists[list].includes(activeId));
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
// With the pointer off every target, fall back to the nearest line in the item's own list, which is how reorder felt before.
export const collide: CollisionDetection = (args) => {
  const listOf = (id: UniqueIdentifier) => args.droppableContainers.find((c) => c.id === id)?.data.current?.list as ListId | undefined;
  const within = pointerWithin(args);
  const onWeek = within.some((c) => CONTAINERS.has(c.id) && listOf(c.id) === 'week');
  const candidates: Collision[] = onWeek ? within.filter((c) => listOf(c.id) === 'week') : within;
  const lines = candidates.filter((c) => !CONTAINERS.has(c.id));
  if (lines.length > 0) return lines;
  if (candidates.length > 0) return candidates;
  const own = args.active.data.current?.list;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !CONTAINERS.has(c.id) && c.data.current?.list === own),
  });
};
