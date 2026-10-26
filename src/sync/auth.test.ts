import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthFailure, supabaseAuth, toEmail, toUsername } from './auth';

function client(result: { error: { code?: string; message: string } | null }) {
  const auth = {
    signUp: vi.fn(async () => result),
    signInWithPassword: vi.fn(async () => result),
  };
  return { auth, api: supabaseAuth({ auth } as unknown as SupabaseClient) };
}

describe('usernames', () => {
  it('become an address nothing is sent to, and back', () => {
    expect(toEmail('  Alex_1 ')).toBe('alex_1@today.invalid');
    expect(toUsername('alex_1@today.invalid')).toBe('alex_1');
  });
});

describe('supabaseAuth', () => {
  it('creates an account from a username and password', async () => {
    const { auth, api } = client({ error: null });
    await api.signUp('Alex', 'long enough');
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'alex@today.invalid', password: 'long enough' });
  });

  it('signs in with a username and password', async () => {
    const { auth, api } = client({ error: null });
    await api.signIn('alex', 'long enough');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'alex@today.invalid', password: 'long enough' });
  });

  it.each([
    ['user_already_exists', 'taken'],
    ['weak_password', 'weak'],
    ['invalid_credentials', 'wrong'],
    ['over_request_rate_limit', 'other'],
  ])('turns %s into %s', async (code, reason) => {
    const { api } = client({ error: { code, message: code } });
    await expect(api.signUp('alex', 'long enough')).rejects.toEqual(new AuthFailure(reason as AuthFailure['reason']));
  });

  it('refuses a new password under 8 characters without asking the server', async () => {
    const { auth, api } = client({ error: null });
    await expect(api.signUp('alex', 'short')).rejects.toEqual(new AuthFailure('weak'));
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('refuses a username outside the rules without asking the server', async () => {
    const { auth, api } = client({ error: null });
    await expect(api.signUp('a b', 'long enough')).rejects.toEqual(new AuthFailure('username'));
    await expect(api.signIn('x', 'long enough')).rejects.toEqual(new AuthFailure('username'));
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
