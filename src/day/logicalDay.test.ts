import { describe, it, expect } from 'vitest';
import { logicalDay, dayLabel, dayParts, daysBetween, nextDay } from './logicalDay';

describe('logicalDay', () => {
  it('counts 03:59 as the previous day', () => {
    expect(logicalDay(new Date(2026, 9, 2, 3, 59))).toBe('2026-10-01');
  });
  it('starts a new day at 04:00', () => {
    expect(logicalDay(new Date(2026, 9, 2, 4, 0))).toBe('2026-10-02');
  });
  it('keeps late evening on the same day', () => {
    expect(logicalDay(new Date(2026, 9, 2, 23, 30))).toBe('2026-10-02');
  });
  it('crosses year boundaries', () => {
    expect(logicalDay(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
  });
  it('handles NZ daylight saving start (02:00 jumps to 03:00)', () => {
    expect(logicalDay(new Date(2026, 8, 27, 3, 30))).toBe('2026-09-26');
  });
});

describe('dayLabel', () => {
  it('gives weekday and short date', () => {
    expect(dayLabel('2026-10-02')).toEqual({ weekday: 'Friday', date: '2 Oct' });
  });
});

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-10-01', '2026-10-02')).toBe(1);
    expect(daysBetween('2026-09-25', '2026-10-05')).toBe(10);
  });
  it('is not thrown off by daylight saving', () => {
    expect(daysBetween('2026-09-26', '2026-09-28')).toBe(2);
  });
});

describe('dayParts', () => {
  it('splits a day into the header number, weekday and month', () => {
    expect(dayParts('2026-10-20')).toEqual({ number: 20, weekday: 'Tuesday', month: 'October' });
    expect(dayParts('2027-01-01')).toEqual({ number: 1, weekday: 'Friday', month: 'January' });
  });
});

describe('nextDay', () => {
  it('gives the next calendar day', () => {
    expect(nextDay('2026-10-22')).toBe('2026-10-23');
  });
  it('crosses month and year ends', () => {
    expect(nextDay('2026-10-31')).toBe('2026-11-01');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });
  it('is not thrown off by daylight saving', () => {
    // NZ clocks go forward early on 27 Sep 2026 (a 23-hour day) and back early on 4 Apr 2027 (25 hours).
    expect(nextDay('2026-09-26')).toBe('2026-09-27');
    expect(nextDay('2026-09-27')).toBe('2026-09-28');
    expect(nextDay('2027-04-03')).toBe('2027-04-04');
    expect(nextDay('2027-04-04')).toBe('2027-04-05');
  });
});
