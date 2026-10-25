import type { Remote } from '../sync/remote';
import type { ServerRow, TableName } from '../sync/rows';

export type FakeRemote = Remote & {
  rows: Record<TableName, Map<string, ServerRow>>;
  pulls: { table: TableName; since: string | null }[];
  beforePush?: () => Promise<void>;
  seed(table: TableName, row: Record<string, unknown>): void;
};

const KEY: Record<TableName, string> = { tasks: 'id', goals: 'id', days: 'day', weeks: 'week' };

// An in-memory server that behaves like the real one: its own clock, times in Postgres's shape,
// and a write that isn't newer than the stored row is dropped.
export function fakeRemote(): FakeRemote {
  let clock = Date.parse('2026-10-25T00:00:00.000Z');
  const rows: FakeRemote['rows'] = { tasks: new Map(), goals: new Map(), days: new Map(), weeks: new Map() };

  function write(table: TableName, row: Record<string, unknown>) {
    const key = String(row[KEY[table]]);
    const old = rows[table].get(key);
    if (old && Date.parse(String(row.updated_at)) <= Date.parse(String(old.updated_at))) return;
    clock += 1000;
    rows[table].set(key, { ...row, server_updated_at: new Date(clock).toISOString().replace('Z', '+00:00') });
  }

  const fake: FakeRemote = {
    rows,
    pulls: [],
    async pull(table, since, limit) {
      fake.pulls.push({ table, since });
      return [...rows[table].values()]
        .filter((r) => since === null || Date.parse(r.server_updated_at) >= Date.parse(since))
        .sort((a, b) => Date.parse(a.server_updated_at) - Date.parse(b.server_updated_at))
        .slice(0, limit);
    },
    async push(table, batch) {
      await fake.beforePush?.();
      for (const row of batch) write(table, row);
    },
    seed: write,
  };
  return fake;
}
