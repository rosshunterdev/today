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
export async function syncOnce(remote: Remote, opts: { pageSize?: number } = {}): Promise<void> {
  const pageSize = opts.pageSize ?? PAGE;
  const days = new Set<string>();
  const weeks = new Set<string>();
  for (const table of SYNC_TABLES) {
    const pulled = await pull(remote, table, pageSize);
    if (table === 'tasks') for (const r of pulled) days.add(r.day as string);
    if (table === 'goals') for (const r of pulled) weeks.add(r.week as string);
  }
  await repairPositions([...days], [...weeks]);
  for (const table of SYNC_TABLES) await push(remote, table, pageSize);
}

async function pull(remote: Remote, table: TableName, pageSize: number): Promise<LocalRow[]> {
  const mark = await getWatermark(table);
  let since = mark ? new Date(Date.parse(mark) - LOOK_BACK_MS).toISOString() : null;
  let newest = mark;
  const all: LocalRow[] = [];
  for (;;) {
    const page = await remote.pull(table, since, pageSize);
    if (page.length === 0) break;
    const rows = page.map((r) => fromServer(table, r));
    await applyPulled(table, rows);
    all.push(...rows);
    const last = normaliseTime(page[page.length - 1].server_updated_at);
    if (!newest || last > newest) newest = last;
    // A full page all stamped at `since` would repeat forever; it can't happen with the server's microsecond clock.
    if (page.length < pageSize || last === since) break;
    since = last;
  }
  if (newest && newest !== mark) await setWatermark(table, newest);
  return all;
}

async function push(remote: Remote, table: TableName, pageSize: number): Promise<void> {
  const rows = await dirtyRows(table);
  for (let i = 0; i < rows.length; i += pageSize) {
    const chunk = rows.slice(i, i + pageSize);
    await remote.push(table, chunk.map((r) => toServer(table, r)));
    await markPushed(table, chunk);
  }
}
