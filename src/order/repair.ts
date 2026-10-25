import { byPosition, positionBetween } from './position';

// Two devices can give two lines the same place while offline. Two lines on one position break inserts
// between them, so after a pull the later id moves just after the other. Every device works this out
// the same way from the same rows, so they agree.
export function positionRepairs(rows: { id: string; position: string }[]): { id: string; position: string }[] {
  const sorted = [...rows].sort((a, b) => byPosition(a, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const moves: { id: string; position: string }[] = [];
  let prev = sorted[0]?.position ?? null;
  for (let i = 1; i < sorted.length; i++) {
    const row = sorted[i];
    if (prev === null || row.position > prev) {
      prev = row.position;
      continue;
    }
    const next = sorted.slice(i + 1).find((r) => r.position > prev!)?.position ?? null;
    prev = positionBetween(prev, next);
    moves.push({ id: row.id, position: prev });
  }
  return moves;
}
