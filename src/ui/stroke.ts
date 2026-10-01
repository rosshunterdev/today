export const MIN_STRIKE_PX = 40;

export function isStrike(dx: number, dy: number, lineWidth: number): boolean {
  const needed = Math.max(MIN_STRIKE_PX, lineWidth * 0.3);
  return Math.abs(dx) >= needed && Math.abs(dy) <= Math.abs(dx) * 0.5;
}
