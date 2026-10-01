import { generateKeyBetween } from 'fractional-indexing';

export function positionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

// Plain code-unit comparison. Never localeCompare: fractional keys are not words.
export function byPosition(a: { position: string }, b: { position: string }): number {
  if (a.position < b.position) return -1;
  if (a.position > b.position) return 1;
  return 0;
}
