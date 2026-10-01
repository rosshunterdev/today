import { describe, it, expect } from 'vitest';
import { positionBetween, byPosition } from './position';

describe('positionBetween', () => {
  it('creates a first position', () => {
    expect(typeof positionBetween(null, null)).toBe('string');
  });
  it('sorts between two positions, before the first and after the last', () => {
    const a = positionBetween(null, null);
    const c = positionBetween(a, null);
    const b = positionBetween(a, c);
    const z = positionBetween(null, a);
    const sorted = [c, b, z, a].map((position) => ({ position })).sort(byPosition).map((p) => p.position);
    expect(sorted).toEqual([z, a, b, c]);
  });
  it('stays unique and ordered after many inserts into the same gap', () => {
    const first = positionBetween(null, null);
    const last = positionBetween(first, null);
    const made: string[] = [];
    let lower = first;
    for (let i = 0; i < 50; i++) {
      lower = positionBetween(lower, last);
      made.push(lower);
    }
    expect(new Set(made).size).toBe(50);
    const sorted = [...made].map((position) => ({ position })).sort(byPosition).map((p) => p.position);
    expect(sorted).toEqual(made);
  });
});
