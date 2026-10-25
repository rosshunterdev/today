import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServerRow, TableName } from './rows';

export interface Remote {
  // Rows changed at or after `since` (server time), oldest first. Overlap is fine: applying a row twice changes nothing.
  pull(table: TableName, since: string | null, limit: number): Promise<ServerRow[]>;
  push(table: TableName, rows: Record<string, unknown>[]): Promise<void>;
}

const CONFLICT: Record<TableName, string> = { tasks: 'user_id,id', goals: 'user_id,id', days: 'user_id,day', weeks: 'user_id,week' };
const TIE_BREAK: Record<TableName, string> = { tasks: 'id', goals: 'id', days: 'day', weeks: 'week' };

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async pull(table, since, limit) {
      let query = client.from(table).select('*').order('server_updated_at').order(TIE_BREAK[table]).limit(limit);
      if (since) query = query.gte('server_updated_at', since);
      const { data, error } = await query;
      if (error) throw error;
      return data as ServerRow[];
    },
    async push(table, rows) {
      if (rows.length === 0) return;
      // user_id comes from the session (column default); an older row is dropped by the server's trigger.
      const { error } = await client.from(table).upsert(rows, { onConflict: CONFLICT[table] });
      if (error) throw error;
    },
  };
}
