import { describe, it, expect } from 'vitest';
import { logicalDay, dayLabel, daysBetween } from './logicalDay';

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
