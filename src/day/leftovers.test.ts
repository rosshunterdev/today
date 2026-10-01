import { describe, it, expect } from 'vitest';
import { isUnfinished, leftoversSourceDay, copyForToday } from './leftovers';
import { makeTask } from '../test/factories';

const TODAY = '2026-10-05';

describe('isUnfinished', () => {
  it('is true for an open task with text', () => {
    expect(isUnfinished(makeTask())).toBe(true);
  });
  it('is false when done, deleted, empty or whitespace-only', () => {
    expect(isUnfinished(makeTask({ done: true }))).toBe(false);
    expect(isUnfinished(makeTask({ deleted: true }))).toBe(false);
    expect(isUnfinished(makeTask({ text: '' }))).toBe(false);
    expect(isUnfinished(makeTask({ text: '   ' }))).toBe(false);
  });
});

describe('leftoversSourceDay', () => {
  it('picks the most recent earlier day with an unfinished task', () => {
    const tasks = [
      makeTask({ day: '2026-10-01' }),
      makeTask({ day: '2026-10-02' }),
      makeTask({ day: '2026-10-04', done: true }),
    ];
    expect(leftoversSourceDay(tasks, TODAY)).toBe('2026-10-02');
  });
  it('ignores today and later days', () => {
    const tasks = [makeTask({ day: TODAY }), makeTask({ day: '2026-10-06' })];
    expect(leftoversSourceDay(tasks, TODAY)).toBeNull();
  });
  it('ignores deleted and blank tasks', () => {
    const tasks = [
      makeTask({ day: '2026-10-04', deleted: true }),
      makeTask({ day: '2026-10-04', text: '  ' }),
    ];
    expect(leftoversSourceDay(tasks, TODAY)).toBeNull();
  });
  it('returns null with no tasks', () => {
    expect(leftoversSourceDay([], TODAY)).toBeNull();
  });
});

describe('copyForToday', () => {
  it('copies text, indent and mark onto today as a fresh open task', () => {
    const source = makeTask({ text: 'gym', indent: 1, mark: 'star', done: false, position: 'a5' });
    const copy = copyForToday(source, TODAY, 'b0', 'new-id', '2026-10-05T08:00:00.000Z');
    expect(copy).toEqual({
      id: 'new-id',
      day: TODAY,
      text: 'gym',
      done: false,
      doneAt: null,
      position: 'b0',
      indent: 1,
      mark: 'star',
      createdAt: '2026-10-05T08:00:00.000Z',
      updatedAt: '2026-10-05T08:00:00.000Z',
      deleted: false,
    });
  });
});
