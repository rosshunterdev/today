import { describe, it, expect } from 'vitest';
import type { CollisionDetection } from '@dnd-kit/core';
import { collide, resolveDrop, BIN_ID, CORNER_ID, LIST_DROP_ID, OLD_DROP_ID, type ListId } from './drop';

const lists = { today: ['t1', 't2', 't3'], tomorrow: ['m1', 'm2'], week: ['g1', 'g2'] };

describe('resolveDrop', () => {
  it('reorders within a list like arrayMove', () => {
    expect(resolveDrop(lists, 't1', 't3')).toEqual({ kind: 'reorder', list: 'today', id: 't1', prevId: 't3', nextId: null });
    expect(resolveDrop(lists, 'g2', 'g1')).toEqual({ kind: 'reorder', list: 'week', id: 'g2', prevId: null, nextId: 'g1' });
  });

  it('does nothing with no target, onto itself, or onto the blank part of its own list', () => {
    expect(resolveDrop(lists, 't1', null)).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 't1', 't1')).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 't1', LIST_DROP_ID.today)).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 'g1', LIST_DROP_ID.week)).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 'unknown', 't1')).toEqual({ kind: 'none' });
  });

  it('moves a task in front of the goal it was dropped on', () => {
    expect(resolveDrop(lists, 't2', 'g2')).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't2', prevId: 'g1', nextId: 'g2' });
    expect(resolveDrop(lists, 't2', 'g1')).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't2', prevId: null, nextId: 'g1' });
  });

  it('appends when dropped on the other list itself or on its corner', () => {
    expect(resolveDrop(lists, 't2', LIST_DROP_ID.week)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't2', prevId: 'g2', nextId: null });
    expect(resolveDrop(lists, 't2', CORNER_ID.week)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't2', prevId: 'g2', nextId: null });
    expect(resolveDrop(lists, 'g1', LIST_DROP_ID.today)).toEqual({ kind: 'transfer', from: 'week', to: 'today', id: 'g1', prevId: 't3', nextId: null });
  });

  it('moves an old page line onto today or into the week, and never onto another old line', () => {
    const old = ['o1', 'o2'];
    expect(resolveDrop(lists, 'o1', 't2', old)).toEqual({ kind: 'transfer', from: 'old', to: 'today', id: 'o1', prevId: 't1', nextId: 't2' });
    expect(resolveDrop(lists, 'o1', LIST_DROP_ID.today, old)).toEqual({ kind: 'transfer', from: 'old', to: 'today', id: 'o1', prevId: 't3', nextId: null });
    expect(resolveDrop(lists, 'o1', CORNER_ID.week, old)).toEqual({ kind: 'transfer', from: 'old', to: 'week', id: 'o1', prevId: 'g2', nextId: null });
    expect(resolveDrop(lists, 'o1', 'o2', old)).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 'o1', OLD_DROP_ID, old)).toEqual({ kind: 'none' });
  });

  it('drops into an empty list as its only item', () => {
    const empty = { today: ['t1'], tomorrow: [], week: [] };
    expect(resolveDrop(empty, 't1', CORNER_ID.week)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't1', prevId: null, nextId: null });
    expect(resolveDrop({ today: [], tomorrow: [], week: ['g1'] }, 'g1', LIST_DROP_ID.today)).toEqual({ kind: 'transfer', from: 'week', to: 'today', id: 'g1', prevId: null, nextId: null });
  });

  it('appends to today from the back-to-today corner, and ignores a drop on a line’s own corner', () => {
    expect(resolveDrop(lists, 'g1', CORNER_ID.today)).toEqual({ kind: 'transfer', from: 'week', to: 'today', id: 'g1', prevId: 't3', nextId: null });
    expect(resolveDrop(lists, 'o1', CORNER_ID.today, ['o1'])).toEqual({ kind: 'transfer', from: 'old', to: 'today', id: 'o1', prevId: 't3', nextId: null });
    expect(resolveDrop(lists, 't1', CORNER_ID.today)).toEqual({ kind: 'none' });
  });

  it('moves lines into Tomorrow from today, the week and old pages', () => {
    expect(resolveDrop(lists, 't2', 'm2')).toEqual({ kind: 'transfer', from: 'today', to: 'tomorrow', id: 't2', prevId: 'm1', nextId: 'm2' });
    expect(resolveDrop(lists, 'g1', LIST_DROP_ID.tomorrow)).toEqual({ kind: 'transfer', from: 'week', to: 'tomorrow', id: 'g1', prevId: 'm2', nextId: null });
    expect(resolveDrop(lists, 'o1', LIST_DROP_ID.tomorrow, ['o1'])).toEqual({ kind: 'transfer', from: 'old', to: 'tomorrow', id: 'o1', prevId: 'm2', nextId: null });
    // The folded header is the whole drop target while Tomorrow is empty.
    expect(resolveDrop({ ...lists, tomorrow: [] }, 't1', LIST_DROP_ID.tomorrow)).toEqual({ kind: 'transfer', from: 'today', to: 'tomorrow', id: 't1', prevId: null, nextId: null });
  });

  it('moves a Tomorrow line back to today or into the week, reorders it, and bins it', () => {
    expect(resolveDrop(lists, 'm1', LIST_DROP_ID.today)).toEqual({ kind: 'transfer', from: 'tomorrow', to: 'today', id: 'm1', prevId: 't3', nextId: null });
    expect(resolveDrop(lists, 'm1', 'g1')).toEqual({ kind: 'transfer', from: 'tomorrow', to: 'week', id: 'm1', prevId: null, nextId: 'g1' });
    expect(resolveDrop(lists, 'm1', 'm2')).toEqual({ kind: 'reorder', list: 'tomorrow', id: 'm1', prevId: 'm2', nextId: null });
    expect(resolveDrop(lists, 'm1', LIST_DROP_ID.tomorrow)).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 'm1', BIN_ID)).toEqual({ kind: 'bin', from: 'tomorrow', id: 'm1' });
  });

  it('bins a line from any list, and nothing that isn’t a line', () => {
    expect(resolveDrop(lists, 't2', BIN_ID)).toEqual({ kind: 'bin', from: 'today', id: 't2' });
    expect(resolveDrop(lists, 'g1', BIN_ID)).toEqual({ kind: 'bin', from: 'week', id: 'g1' });
    expect(resolveDrop(lists, 'o1', BIN_ID, ['o1'])).toEqual({ kind: 'bin', from: 'old', id: 'o1' });
    expect(resolveDrop(lists, 'unknown', BIN_ID)).toEqual({ kind: 'none' });
  });
});

describe('collide', () => {
  type Box = { id: string; list?: ListId | 'old'; top: number; left: number; width: number; height: number };
  const rect = (b: Omit<Box, 'id' | 'list'>) => ({ ...b, right: b.left + b.width, bottom: b.top + b.height });

  // Desktop-ish layout: today's page on the left with two lines, the week note bottom-right with one goal.
  const boxes: Box[] = [
    { id: LIST_DROP_ID.today, list: 'today', top: 0, left: 0, width: 600, height: 800 },
    { id: 't1', list: 'today', top: 80, left: 0, width: 600, height: 36 },
    { id: 't2', list: 'today', top: 116, left: 0, width: 600, height: 36 },
    { id: LIST_DROP_ID.week, list: 'week', top: 600, left: 900, width: 270, height: 150 },
    { id: 'g1', list: 'week', top: 640, left: 900, width: 270, height: 36 },
    // A phone-style old pages stack lying over the right half of today's second line.
    { id: OLD_DROP_ID, list: 'old', top: 110, left: 300, width: 300, height: 60 },
  ];

  function run(activeList: ListId | 'old', pointer: { x: number; y: number } | null, layout: Box[] = boxes) {
    const droppableRects = new Map(layout.map((b) => [b.id, rect(b)]));
    const droppableContainers = layout.map((b) => ({ id: b.id, key: b.id, data: { current: { list: b.list } }, disabled: false, node: { current: null }, rect: { current: rect(b) } }));
    const at = pointer ?? { x: 300, y: 98 };
    return collide({
      active: { id: 'dragged', data: { current: { list: activeList } }, rect: { current: { initial: null, translated: null } } },
      collisionRect: rect({ top: at.y - 18, left: at.x - 300, width: 600, height: 36 }),
      droppableRects,
      droppableContainers,
      pointerCoordinates: pointer,
    } as unknown as Parameters<CollisionDetection>[0]).map((c) => c.id);
  }

  it('prefers the line under the pointer over the list around it', () => {
    expect(run('today', { x: 150, y: 130 })).toEqual(['t2']);
  });

  it('drops a goal on blank paper below today’s lines into today', () => {
    expect(run('week', { x: 300, y: 500 })).toEqual([LIST_DROP_ID.today]);
  });

  it('drops a task on the note outside its lines into the week', () => {
    expect(run('today', { x: 1000, y: 610 })).toEqual([LIST_DROP_ID.week]);
  });

  it('finds nothing on blank desk, so the drop writes nothing', () => {
    expect(run('today', { x: 750, y: 300 })).toEqual([]);
  });

  it('finds nothing over the old pages stack, even with today’s line underneath', () => {
    expect(run('old', { x: 450, y: 130 })).toEqual([]);
  });

  // Tomorrow sits under today's lines, inside today's page.
  const withTomorrow: Box[] = [
    ...boxes,
    { id: LIST_DROP_ID.tomorrow, list: 'tomorrow', top: 300, left: 0, width: 600, height: 108 },
    { id: 'm1', list: 'tomorrow', top: 336, left: 0, width: 600, height: 36 },
  ];

  it('over Tomorrow, only its own targets count, though today’s page lies underneath', () => {
    expect(run('today', { x: 150, y: 318 }, withTomorrow)).toEqual([LIST_DROP_ID.tomorrow]); // the header
    expect(run('week', { x: 150, y: 390 }, withTomorrow)).toEqual([LIST_DROP_ID.tomorrow]); // blank rows in Tomorrow
    expect(run('today', { x: 150, y: 350 }, withTomorrow)).toEqual(['m1']);
    expect(run('week', { x: 150, y: 500 }, withTomorrow)).toEqual([LIST_DROP_ID.today]); // below Tomorrow is today's paper
  });

  it('keyboard drags (no pointer) fall back to the nearest line in their own list', () => {
    expect(run('today', null)[0]).toBe('t1');
  });

  // Phone pages: a folded corner floats over whatever is at the bottom of the screen.
  const phoneToday: Box[] = [
    { id: LIST_DROP_ID.today, list: 'today', top: 0, left: 0, width: 400, height: 800 },
    { id: 't9', list: 'today', top: 740, left: 0, width: 400, height: 36 },
    { id: CORNER_ID.week, list: 'week', top: 720, left: 280, width: 120, height: 80 },
  ];
  const phoneMore: Box[] = [
    { id: LIST_DROP_ID.week, list: 'week', top: 0, left: 0, width: 400, height: 500 },
    { id: 'g1', list: 'week', top: 120, left: 0, width: 400, height: 36 },
    { id: OLD_DROP_ID, list: 'old', top: 500, left: 0, width: 400, height: 300 },
    { id: 'o1', list: 'old', top: 540, left: 0, width: 400, height: 36 },
    { id: CORNER_ID.today, list: 'today', top: 720, left: 0, width: 120, height: 80 },
  ];
  const phoneLongWeek: Box[] = [
    { id: LIST_DROP_ID.week, list: 'week', top: 0, left: 0, width: 400, height: 800 },
    { id: CORNER_ID.today, list: 'today', top: 720, left: 0, width: 120, height: 80 },
  ];

  it('a drop on the this-week corner means the week, even over today’s lines', () => {
    expect(run('today', { x: 360, y: 760 }, phoneToday)).toEqual([CORNER_ID.week]);
  });

  it('a drop on the back-to-today corner means today, even over an old page or the week', () => {
    expect(run('old', { x: 40, y: 760 }, phoneMore)).toEqual([CORNER_ID.today]);
    expect(run('week', { x: 40, y: 760 }, phoneLongWeek)).toEqual([CORNER_ID.today]);
  });

  // Wide screens: the bin sits in the bottom-right corner of the week page.
  const wideWithBin: Box[] = [...boxes, { id: BIN_ID, top: 700, left: 1100, width: 48, height: 48 }];

  it('a drop on the bin means bin, even over the week', () => {
    expect(run('today', { x: 1120, y: 720 }, wideWithBin)).toEqual([BIN_ID]);
  });

  // Phones: while a line is lifted the bin floats over today's lines, above the corners.
  const phoneWithBin: Box[] = [
    { id: LIST_DROP_ID.today, list: 'today', top: 0, left: 0, width: 400, height: 800 },
    { id: 't8', list: 'today', top: 620, left: 0, width: 400, height: 36 },
    { id: BIN_ID, top: 608, left: 172, width: 56, height: 56 },
    { id: CORNER_ID.week, list: 'week', top: 720, left: 280, width: 120, height: 80 },
  ];

  it('on a phone, a drop on the floating bin means bin, even over a line', () => {
    expect(run('today', { x: 200, y: 636 }, phoneWithBin)).toEqual([BIN_ID]);
  });

  it('keyboard drags never land in the bin, even when it is nearest', () => {
    expect(run('today', null, [...boxes, { id: BIN_ID, top: 80, left: 0, width: 600, height: 36 }])[0]).toBe('t1');
  });
});
