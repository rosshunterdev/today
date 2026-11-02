import type { Remote } from './remote';
import { fromServer, normaliseTime, toServer, type LocalRow, type TableName } from './rows';
import {
  SYNC_TABLES,
  applyPulled,
  dirtyRows,
  getWatermark,
  markPushed,
  repairPositions,
  setWatermark,
} from '../store/syncState';

const PAGE = 500;
// A change can commit a moment after a later-stamped one; looking back a minute catches it. Re-applying is harmless.
const LOOK_BACK_MS = 60_000;

// One round: pull everything changed elsewhere, repair clashing positions, push everything changed here.
// Once `active` turns false (signed out, account deleted), the round stops before its next write to the device.
export async function syncOnce(
  remote: Remote,
  opts: { pageSize?: number; active?: () => boolean } = {},
): Promise<void> {
  const pageSize = opts.pageSize ?? PAGE;
  const active = opts.active ?? (() => true);
  const days = new Set<string>();
  const weeks = new Set<string>();
  for (const table of SYNC_TABLES) {
    const pulled = await pull(remote, table, pageSize, active);
    if (!pulled) return;
    if (table === 'tasks') for (const r of pulled) days.add(r.day as string);
    if (table === 'goals') for (const r of pulled) weeks.add(r.week as string);
  }
  if (!active()) return;
  await repairPositions([...days], [...weeks]);
  for (const table of SYNC_TABLES) if (!(await push(remote, table, pageSize, active))) return;
}

// Null when the round was stopped part way.
async function pull(remote: Remote, table: TableName, pageSize: number, active: () => boolean): Promise<LocalRow[] | null> {
  const mark = await getWatermark(table);
  let since = mark ? new Date(Date.parse(mark) - LOOK_BACK_MS).toISOString() : null;
  let newest = mark;
  const all: LocalRow[] = [];
  for (;;) {
    const page = await remote.pull(table, since, pageSize);
    if (page.length === 0) break;
    const rows = page.map((r) => fromServer(table, r));
    if (!active()) return null;
    await applyPulled(table, rows);
    all.push(...rows);
    const last = normaliseTime(page[page.length - 1].server_updated_at);
    if (!newest || last > newest) newest = last;
    // A full page all stamped at `since` would repeat forever; it can't happen with the server's microsecond clock.
    if (page.length < pageSize || last === since) break;
    since = last;
  }
  if (!active()) return null;
  if (newest && newest !== mark) await setWatermark(table, newest);
  return all;
}

// False when the round was stopped part way.
async function push(remote: Remote, table: TableName, pageSize: number, active: () => boolean): Promise<boolean> {
  const rows = await dirtyRows(table);
  for (let i = 0; i < rows.length; i += pageSize) {
    const chunk = rows.slice(i, i + pageSize);
    await remote.push(table, chunk.map((r) => toServer(table, r)));
    if (!active()) return false;
    await markPushed(table, chunk);
  }
  return true;
}
