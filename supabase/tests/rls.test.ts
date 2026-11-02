import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, anon, conflictKeys, newUser, removeTrackedUsers, samples, taskRow, T1, T2 } from './helpers';

type User = { id: string; client: SupabaseClient };
const tables = ['tasks', 'goals', 'days', 'weeks'] as const;

let a: User;
let b: User;

beforeAll(async () => {
  [a, b] = await Promise.all([newUser(), newUser()]);
});

// Removes a, b and delete_account's user c, even if a test fails before c deletes itself.
afterAll(removeTrackedUsers);

describe.each(tables)('%s', (table) => {
  it("stamps the owner and the server's time on a new row", async () => {
    const row = samples[table]();
    const { error } = await a.client.from(table).upsert(row, { onConflict: conflictKeys[table] });
    expect(error).toBeNull();
    const { data } = await a.client.from(table).select('user_id, server_updated_at');
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0].user_id).toBe(a.id);
    expect(Date.parse(data![0].server_updated_at)).toBeGreaterThan(Date.parse('2026-01-01'));
  });

  it("hides one person's rows from another", async () => {
    await a.client.from(table).upsert(samples[table](), { onConflict: conflictKeys[table] });
    const { data, error } = await b.client.from(table).select('*').eq('user_id', a.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("won't let anyone write a row as someone else", async () => {
    const { error } = await b.client.from(table).insert({ ...samples[table](), user_id: a.id });
    expect(error?.code).toBe('42501');
  });

  it('has no deletes (rows are soft deleted)', async () => {
    const { error } = await a.client.from(table).delete().eq('user_id', a.id);
    expect(error?.code).toBe('42501');
  });

  it('gives signed-out visitors nothing', async () => {
    const { error } = await anon().from(table).select('*');
    expect(error?.code).toBe('42501');
  });
});

describe('tasks', () => {
  it("won't let one person change another's row", async () => {
    const row = taskRow();
    await a.client.from('tasks').insert(row);
    await b.client.from('tasks').update({ text: 'hacked', updated_at: T2 }).eq('id', row.id);
    const { data } = await a.client.from('tasks').select('text').eq('id', row.id).single();
    expect(data!.text).toBe('buy milk');
  });

  it('keeps the newer row when an older write arrives late', async () => {
    const row = taskRow();
    await a.client.from('tasks').upsert({ ...row, text: 'newer', updated_at: T2 }, { onConflict: 'user_id,id' });
    const { error } = await a.client.from('tasks').upsert({ ...row, text: 'older', updated_at: T1 }, { onConflict: 'user_id,id' });
    expect(error).toBeNull();
    const { data } = await a.client.from('tasks').select('text').eq('id', row.id).single();
    expect(data!.text).toBe('newer');
  });

  it('ignores a server time sent by the device', async () => {
    const row = taskRow();
    await a.client.from('tasks').insert({ ...row, server_updated_at: '2000-01-01T00:00:00Z' });
    const { data } = await a.client.from('tasks').select('server_updated_at').eq('id', row.id).single();
    expect(Date.parse(data!.server_updated_at)).toBeGreaterThan(Date.parse('2026-01-01'));
  });
});

describe('delete_account', () => {
  it('deletes the signed-in account and every row in it', async () => {
    const c = await newUser();
    await c.client.from('tasks').insert(taskRow());
    const { error } = await c.client.rpc('delete_account');
    expect(error).toBeNull();
    const { data: rows } = await admin().from('tasks').select('id').eq('user_id', c.id);
    expect(rows).toEqual([]);
    const { data: found } = await admin().auth.admin.getUserById(c.id);
    expect(found.user).toBeNull();
  });

  it("can't be called by a signed-out visitor", async () => {
    const { error } = await anon().rpc('delete_account');
    expect(error).not.toBeNull();
  });
});
