import { describe, it, expect } from 'vitest';
import { neighboursAfterMove } from './reorder';

const ids = ['a', 'b', 'c', 'd'];

describe('neighboursAfterMove', () => {
  it('moves down', () => {
    expect(neighboursAfterMove(ids, 'a', 'c')).toEqual({ prevId: 'c', nextId: 'd' });
  });
  it('moves up', () => {
    expect(neighboursAfterMove(ids, 'd', 'b')).toEqual({ prevId: 'a', nextId: 'b' });
  });
  it('moves to the top', () => {
    expect(neighboursAfterMove(ids, 'c', 'a')).toEqual({ prevId: null, nextId: 'a' });
  });
  it('moves to the bottom', () => {
    expect(neighboursAfterMove(ids, 'b', 'd')).toEqual({ prevId: 'd', nextId: null });
  });
});
