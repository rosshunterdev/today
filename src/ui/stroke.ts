export const MIN_STRIKE_PX = 40;
// A line on the old 36rem page. Wide screens make lines far longer, but a stroke shouldn't have to grow with them.
export const MAX_STRIKE_LINE_PX = 544;

export function isStrike(dx: number, dy: number, lineWidth: number): boolean {
  const needed = Math.max(MIN_STRIKE_PX, Math.min(lineWidth, MAX_STRIKE_LINE_PX) * 0.3);
  return Math.abs(dx) >= needed && Math.abs(dy) <= Math.abs(dx) * 0.5;
}
