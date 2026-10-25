import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_TEST_URL;
const publishable = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_TEST_SECRET_KEY;
if (!url || !publishable || !secret) throw new Error('Fill .env.test.local (see .env.example) before npm run test:rls');

const options = { auth: { persistSession: false, autoRefreshToken: false } };

// The secret key skips row-level security: only for making and removing test users and checking what's left.
export const admin = () => createClient(url, secret, options);
export const anon = () => createClient(url, publishable, options);

// A throwaway user, signed in the same way the app does (an email one-time code), without sending any email.
export async function newUser(): Promise<{ id: string; client: SupabaseClient }> {
  const email = `rls-${crypto.randomUUID()}@example.com`;
  const a = admin();
  const { data: created, error } = await a.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const { data: link, error: linkError } = await a.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError) throw linkError;
  const client = anon();
  const { error: otpError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' });
  if (otpError) throw otpError;
  return { id: created.user.id, client };
}

export async function removeUser(id: string): Promise<void> {
  await admin().auth.admin.deleteUser(id);
}

export const T1 = '2026-10-25T01:00:00.000Z';
export const T2 = '2026-10-25T02:00:00.000Z';

export function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    day: '2026-10-25',
    text: 'buy milk',
    done: false,
    done_at: null,
    position: 'a0',
    indent: 0,
    mark: null,
    notes: '',
    created_at: T1,
    updated_at: T1,
    deleted: false,
    ...overrides,
  };
}

// One sample row per table, keyed so each test user can write the same keys without clashing.
export const samples = {
  tasks: () => taskRow(),
  goals: () => ({
    id: crypto.randomUUID(),
    week: '2026-10-19',
    text: 'finish the plan',
    notes: '',
    done: false,
    done_at: null,
    position: 'a0',
    created_at: T1,
    updated_at: T1,
    deleted: false,
  }),
  days: () => ({ day: '2026-10-25', binned: false, updated_at: T1 }),
  weeks: () => ({ week: '2026-10-19', leftovers_dismissed: false, updated_at: T1 }),
} as const;

export const conflictKeys = { tasks: 'user_id,id', goals: 'user_id,id', days: 'user_id,day', weeks: 'user_id,week' } as const;
