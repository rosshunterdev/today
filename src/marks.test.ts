import { describe, it, expect } from 'vitest';
import { nextMark, MARK_GLYPH } from './marks';

describe('nextMark', () => {
  it('cycles none, star, bang, question, none', () => {
    expect(nextMark(null)).toBe('star');
    expect(nextMark('star')).toBe('bang');
    expect(nextMark('bang')).toBe('question');
    expect(nextMark('question')).toBeNull();
  });
  it('has a glyph for each mark', () => {
    expect(MARK_GLYPH).toEqual({ star: '★', bang: '!', question: '?' });
  });
});
