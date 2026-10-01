import type { Mark } from './model';

const CYCLE: Mark[] = [null, 'star', 'bang', 'question'];

export function nextMark(mark: Mark): Mark {
  return CYCLE[(CYCLE.indexOf(mark) + 1) % CYCLE.length];
}

export const MARK_GLYPH: Record<Exclude<Mark, null>, string> = {
  star: '★',
  bang: '!',
  question: '?',
};
