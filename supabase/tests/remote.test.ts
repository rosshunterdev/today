import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseRemote } from '../../src/sync/remote';
import { newUser, removeTrackedUsers, taskRow } from './helpers';

let user: { id: string; client: SupabaseClient };

beforeAll(async () => {
  user = await newUser();
});

afterAll(removeTrackedUsers);

describe('supabaseRemote', () => {
  it('pushes rows, then pulls them oldest first from a point in time, a page at a time', async () => {
    const remote = supabaseRemote(user.client);
    await remote.push('tasks', [taskRow({ text: 'one' })]);
    await remote.push('tasks', [taskRow({ text: 'two' })]);
    await remote.push('tasks', [taskRow({ text: 'three' })]);

    const all = await remote.pull('tasks', null, 500);
    expect(all.map((r) => r.text)).toEqual(['one', 'two', 'three']);

    const page = await remote.pull('tasks', null, 2);
    expect(page).toHaveLength(2);

    const later = await remote.pull('tasks', all[1].server_updated_at, 500);
    expect(later.map((r) => r.text)).toEqual(['two', 'three']);
  });

  it('pushes nothing without a call when there are no rows', async () => {
    await expect(supabaseRemote(user.client).push('days', [])).resolves.toBeUndefined();
  });
});
