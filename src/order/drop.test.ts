import { describe, it, expect } from 'vitest';
import type { CollisionDetection } from '@dnd-kit/core';
import { collide, resolveDrop, LIST_DROP_ID, OLD_DROP_ID, WEEK_TAB_ID, type ListId } from './drop';

const lists = { today: ['t1', 't2', 't3'], week: ['g1', 'g2'] };

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

  it('appends when dropped on the other list itself or on the phone tab', () => {
    expect(resolveDrop(lists, 't2', LIST_DROP_ID.week)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't2', prevId: 'g2', nextId: null });
    expect(resolveDrop(lists, 't2', WEEK_TAB_ID)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't2', prevId: 'g2', nextId: null });
    expect(resolveDrop(lists, 'g1', LIST_DROP_ID.today)).toEqual({ kind: 'transfer', from: 'week', to: 'today', id: 'g1', prevId: 't3', nextId: null });
  });

  it('moves an old page line onto today or into the week, and never onto another old line', () => {
    const old = ['o1', 'o2'];
    expect(resolveDrop(lists, 'o1', 't2', old)).toEqual({ kind: 'transfer', from: 'old', to: 'today', id: 'o1', prevId: 't1', nextId: 't2' });
    expect(resolveDrop(lists, 'o1', LIST_DROP_ID.today, old)).toEqual({ kind: 'transfer', from: 'old', to: 'today', id: 'o1', prevId: 't3', nextId: null });
    expect(resolveDrop(lists, 'o1', WEEK_TAB_ID, old)).toEqual({ kind: 'transfer', from: 'old', to: 'week', id: 'o1', prevId: 'g2', nextId: null });
    expect(resolveDrop(lists, 'o1', 'o2', old)).toEqual({ kind: 'none' });
    expect(resolveDrop(lists, 'o1', OLD_DROP_ID, old)).toEqual({ kind: 'none' });
  });

  it('drops into an empty list as its only item', () => {
    const empty = { today: ['t1'], week: [] };
    expect(resolveDrop(empty, 't1', WEEK_TAB_ID)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't1', prevId: null, nextId: null });
    expect(resolveDrop({ today: [], week: ['g1'] }, 'g1', LIST_DROP_ID.today)).toEqual({ kind: 'transfer', from: 'week', to: 'today', id: 'g1', prevId: null, nextId: null });
  });
});

describe('collide', () => {
  type Box = { id: string; list: ListId | 'old'; top: number; left: number; width: number; height: number };
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

  function run(activeList: ListId | 'old', pointer: { x: number; y: number } | null) {
    const droppableRects = new Map(boxes.map((b) => [b.id, rect(b)]));
    const droppableContainers = boxes.map((b) => ({ id: b.id, key: b.id, data: { current: { list: b.list } }, disabled: false, node: { current: null }, rect: { current: rect(b) } }));
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

  it('keyboard drags (no pointer) fall back to the nearest line in their own list', () => {
    expect(run('today', null)[0]).toBe('t1');
  });
});
