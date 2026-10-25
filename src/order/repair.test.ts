import { describe, it, expect } from 'vitest';
import { positionRepairs } from './repair';

describe('positionRepairs', () => {
  it('changes nothing when every position is different', () => {
    expect(positionRepairs([{ id: 'a', position: 'a0' }, { id: 'b', position: 'a1' }])).toEqual([]);
  });

  it('moves the later id just after the earlier one, before the next line', () => {
    const moves = positionRepairs([
      { id: 'y', position: 'a1' },
      { id: 'x', position: 'a1' },
      { id: 'z', position: 'a2' },
    ]);
    expect(moves).toHaveLength(1);
    expect(moves[0].id).toBe('y');
    expect(moves[0].position > 'a1' && moves[0].position < 'a2').toBe(true);
  });

  it('spreads three lines that share one position, in id order', () => {
    const moves = positionRepairs([
      { id: 'c', position: 'a0' },
      { id: 'a', position: 'a0' },
      { id: 'b', position: 'a0' },
    ]);
    expect(moves.map((m) => m.id)).toEqual(['b', 'c']);
    expect('a0' < moves[0].position && moves[0].position < moves[1].position).toBe(true);
  });

  it('gives the same answer whatever order the rows arrive in', () => {
    const rows = [
      { id: 'b', position: 'a0' },
      { id: 'a', position: 'a0' },
    ];
    expect(positionRepairs(rows)).toEqual(positionRepairs([...rows].reverse()));
  });
});
