import { describe, it, expect, afterAll } from 'vitest';
import { AuthFailure, supabaseAuth } from '../../src/sync/auth';
import { anon, removeTrackedUsers, track } from './helpers';

// The app's own adapter against a local Supabase: a username account really works (D-032).
const username = `rls_${crypto.randomUUID().slice(0, 8)}`;
const password = 'correct horse';
const ids: string[] = [];

async function signedInId(client: ReturnType<typeof anon>): Promise<string> {
  const { data } = await client.auth.getUser();
  return data.user!.id;
}

afterAll(removeTrackedUsers);

describe('username accounts', () => {
  it('signs up and is signed in straight away', async () => {
    const client = anon();
    await supabaseAuth(client).signUp(username, password);
    const id = await signedInId(client);
    ids.push(id);
    track(id);
    const { data } = await client.auth.getUser();
    expect(data.user!.email).toBe(`${username}@today.invalid`);
  });

  it('signs in on another device with the same password', async () => {
    const client = anon();
    await supabaseAuth(client).signIn(username.toUpperCase(), password);
    expect(await signedInId(client)).toBe(ids[0]);
  });

  it('refuses a wrong password', async () => {
    await expect(supabaseAuth(anon()).signIn(username, 'not the password')).rejects.toEqual(new AuthFailure('wrong'));
  });

  it('refuses a username that is taken', async () => {
    await expect(supabaseAuth(anon()).signUp(username, password)).rejects.toEqual(new AuthFailure('taken'));
  });
});
