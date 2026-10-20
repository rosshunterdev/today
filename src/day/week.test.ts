import { describe, it, expect } from 'vitest';
import { weekOf, leftoversSourceWeek, weekLeftoversLabel, copyGoalForWeek, weekRange } from './week';
import { logicalDay } from './logicalDay';
import { makeGoal } from '../test/factories';

describe('weekOf', () => {
  it('maps Monday to Sunday onto that Monday', () => {
    for (const day of ['2026-10-12', '2026-10-14', '2026-10-18']) expect(weekOf(day)).toBe('2026-10-12');
  });
  it('starts a new week on Monday', () => {
    expect(weekOf('2026-10-19')).toBe('2026-10-19');
  });
  it('crosses month and year boundaries', () => {
    expect(weekOf('2026-11-01')).toBe('2026-10-26');
    expect(weekOf('2027-01-01')).toBe('2026-12-28');
  });
  it('follows the 4am rollover', () => {
    expect(weekOf(logicalDay(new Date(2026, 9, 19, 3, 59)))).toBe('2026-10-12');
    expect(weekOf(logicalDay(new Date(2026, 9, 19, 4, 0)))).toBe('2026-10-19');
  });
});

describe('leftoversSourceWeek', () => {
  const WEEK = '2026-10-19';
  it('picks the most recent earlier week with an unfinished goal, skipping empty weeks', () => {
    const goals = [
      makeGoal({ week: '2026-09-28' }),
      makeGoal({ week: '2026-10-05' }),
      makeGoal({ week: '2026-10-12', done: true }),
    ];
    expect(leftoversSourceWeek(goals, WEEK)).toBe('2026-10-05');
  });
  it('ignores this week, later weeks, deleted and blank goals', () => {
    const goals = [
      makeGoal({ week: WEEK }),
      makeGoal({ week: '2026-10-26' }),
      makeGoal({ week: '2026-10-12', deleted: true }),
      makeGoal({ week: '2026-10-12', text: '  ' }),
    ];
    expect(leftoversSourceWeek(goals, WEEK)).toBeNull();
  });
  it('finds last year’s week from the first week of a new year', () => {
    expect(leftoversSourceWeek([makeGoal({ week: '2026-12-21' })], '2027-01-04')).toBe('2026-12-21');
  });
});

describe('weekLeftoversLabel', () => {
  it('says "Last week" for the week before', () => {
    expect(weekLeftoversLabel('2026-10-12', '2026-10-19')).toBe('Last week');
  });
  it('names the Monday for anything older', () => {
    expect(weekLeftoversLabel('2026-09-28', '2026-10-19')).toBe('Week of 28 Sept');
    expect(weekLeftoversLabel('2026-12-21', '2027-01-04')).toBe('Week of 21 Dec');
  });
});

describe('copyGoalForWeek', () => {
  it('copies the text onto the new week as a fresh open goal', () => {
    const source = makeGoal({ text: 'run 3x', done: false, position: 'a5' });
    expect(copyGoalForWeek(source, '2026-10-19', 'b0', 'new-id', '2026-10-19T08:00:00.000Z')).toEqual({
      id: 'new-id',
      week: '2026-10-19',
      text: 'run 3x',
      notes: '',
      done: false,
      doneAt: null,
      position: 'b0',
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:00:00.000Z',
      deleted: false,
    });
  });
});

describe('weekRange', () => {
  it('reads Monday to Sunday, naming the month once', () => {
    expect(weekRange('2026-10-19')).toBe('19 to 25 October');
  });
  it('names both months when the week crosses a month or year end', () => {
    expect(weekRange('2026-09-28')).toBe('28 September to 4 October');
    expect(weekRange('2026-12-28')).toBe('28 December to 3 January');
  });
});
