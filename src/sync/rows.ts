// The same rows on both sides: camelCase in IndexedDB, snake_case in Postgres. Sync bookkeeping
// (dirty, syncedAt) and server columns (user_id, server_updated_at) never cross over.

export type TableName = 'tasks' | 'goals' | 'days' | 'weeks';
export type LocalRow = Record<string, unknown> & { updatedAt: string };
export type ServerRow = Record<string, unknown> & { server_updated_at: string };

export const KEY: Record<TableName, string> = { tasks: 'id', goals: 'id', days: 'day', weeks: 'week' };

const FIELDS: Record<TableName, readonly string[]> = {
  tasks: ['id', 'day', 'text', 'done', 'doneAt', 'position', 'indent', 'mark', 'notes', 'createdAt', 'updatedAt', 'deleted'],
  goals: ['id', 'week', 'text', 'notes', 'done', 'doneAt', 'position', 'createdAt', 'updatedAt', 'deleted'],
  days: ['day', 'binned', 'updatedAt'],
  weeks: ['week', 'leftoversDismissed', 'updatedAt'],
};

const TIMES = new Set(['doneAt', 'createdAt', 'updatedAt']);

const snake = (field: string) => field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// Takes any row object: the model's interfaces (Task, Goal...) have no index signature.
export function toServer(table: TableName, input: object): Record<string, unknown> {
  const local = input as Record<string, unknown>;
  const row: Record<string, unknown> = {};
  for (const field of FIELDS[table]) {
    // Rows written before notes existed have none; the server column is not null.
    row[snake(field)] = field === 'notes' ? (local.notes ?? '') : (local[field] ?? null);
  }
  return row;
}

export function fromServer(table: TableName, row: Record<string, unknown>): LocalRow {
  const local: Record<string, unknown> = {};
  for (const field of FIELDS[table]) {
    const value = row[snake(field)];
    local[field] = TIMES.has(field) && typeof value === 'string' ? normaliseTime(value) : value;
  }
  return local as LocalRow;
}

const TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)$/;

// Postgres writes times its own way (+00:00, no fraction when it's .000, .45, microseconds).
// Last-write-wins compares strings, so every time is brought back to the device's toISOString() shape.
export function normaliseTime(s: string): string {
  const m = TIME.exec(s);
  if (!m) throw new Error(`Not a time: ${s}`);
  const ms = (m[2] ?? '').padEnd(3, '0').slice(0, 3);
  const zone = m[3] === 'Z' ? 'Z' : m[3].length === 3 ? `${m[3]}:00` : m[3].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
  return new Date(`${m[1]}.${ms}${zone}`).toISOString();
}
