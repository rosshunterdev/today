import { describe, it, expect } from 'vitest';
import { addDays, dayMarks, dayTitle, monthGrid, monthOf, monthTitle, relativeDay, shiftMonth } from './calendar';
import { makeTask } from '../test/factories';

describe('calendar months', () => {
  it('names the month a day is in', () => {
    expect(monthOf('2026-11-11')).toBe('2026-11');
  });

  it('steps months across a year end', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('titles a month', () => {
    expect(monthTitle('2026-11')).toBe('November 2026');
  });

  it('lays a month out in whole weeks from Monday', () => {
    const weeks = monthGrid('2026-11'); // 1 November 2026 is a Sunday
    expect(weeks[0]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(weeks[weeks.length - 1][0]).toBe('2026-11-30');
    expect(weeks[weeks.length - 1][6]).toBe('2026-12-06');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('needs only four weeks for a February that starts on a Monday', () => {
    expect(monthGrid('2027-02')).toHaveLength(4);
  });
});

describe('calendar days', () => {
  it('steps days across a month end and back', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-01', -7)).toBe('2026-10-25');
  });

  it('titles a day', () => {
    expect(dayTitle('2026-11-12')).toBe('Thursday 12 November');
  });

  it('says how far a day is from today', () => {
    expect(relativeDay('2026-11-11', '2026-11-11')).toBe('Today');
    expect(relativeDay('2026-11-12', '2026-11-11')).toBe('Tomorrow');
    expect(relativeDay('2026-11-10', '2026-11-11')).toBe('Yesterday');
    expect(relativeDay('2026-11-14', '2026-11-11')).toBe('In 3 days');
    expect(relativeDay('2026-11-06', '2026-11-11')).toBe('5 days ago');
  });
});

describe('dayMarks', () => {
  it('lists each day’s real lines in page order, done or not', () => {
    const marks = dayMarks([
      makeTask({ day: '2026-11-12', text: 'b', position: 'a1', done: true }),
      makeTask({ day: '2026-11-12', text: 'a', position: 'a0' }),
      makeTask({ day: '2026-11-13', text: 'c', position: 'a0' }),
    ]);
    expect(marks.get('2026-11-12')).toEqual([false, true]);
    expect(marks.get('2026-11-13')).toEqual([false]);
  });

  it('leaves out headings, blank lines and deleted lines, but keeps a line that is only a note', () => {
    const marks = dayMarks([
      makeTask({ day: '2026-11-12', text: 'Garden:', position: 'a0' }),
      makeTask({ day: '2026-11-12', text: '  ', position: 'a1' }),
      makeTask({ day: '2026-11-12', text: 'gone', position: 'a2', deleted: true }),
      makeTask({ day: '2026-11-12', text: '', notes: 'ring back', position: 'a3' }),
    ]);
    expect(marks.get('2026-11-12')).toEqual([false]);
  });
});
