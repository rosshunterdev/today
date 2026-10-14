import { describe, it, expect } from 'vitest';
import { resolveDrop, LIST_DROP_ID, WEEK_TAB_ID } from './drop';

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

  it('drops into an empty list as its only item', () => {
    const empty = { today: ['t1'], week: [] };
    expect(resolveDrop(empty, 't1', WEEK_TAB_ID)).toEqual({ kind: 'transfer', from: 'today', to: 'week', id: 't1', prevId: null, nextId: null });
    expect(resolveDrop({ today: [], week: ['g1'] }, 'g1', LIST_DROP_ID.today)).toEqual({ kind: 'transfer', from: 'week', to: 'today', id: 'g1', prevId: null, nextId: null });
  });
});
