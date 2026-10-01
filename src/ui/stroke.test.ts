import { describe, it, expect } from 'vitest';
import { isStrike, MIN_STRIKE_PX } from './stroke';

describe('isStrike', () => {
  it('accepts a long horizontal stroke in either direction', () => {
    expect(isStrike(120, 5, 0)).toBe(true);
    expect(isStrike(-120, 5, 0)).toBe(true);
  });
  it('rejects a tap or short drag', () => {
    expect(isStrike(0, 0, 0)).toBe(false);
    expect(isStrike(MIN_STRIKE_PX - 1, 0, 0)).toBe(false);
  });
  it('rejects a mostly vertical move (scrolling)', () => {
    expect(isStrike(60, 80, 0)).toBe(false);
    expect(isStrike(10, 200, 0)).toBe(false);
  });
  it('needs 30% of a wide line', () => {
    expect(isStrike(100, 0, 400)).toBe(false);
    expect(isStrike(120, 0, 400)).toBe(true);
  });
});
