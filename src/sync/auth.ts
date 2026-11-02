import type { SupabaseClient } from '@supabase/supabase-js';

export interface SessionUser {
  id: string;
  username: string;
}

export type AuthFailureReason = 'username' | 'taken' | 'weak' | 'wrong' | 'closed' | 'other';

export class AuthFailure extends Error {
  constructor(readonly reason: AuthFailureReason) {
    super(reason);
  }
}

export interface AuthApi {
  signUp(username: string, password: string): Promise<void>;
  signIn(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  // Called with the signed-in user, or null, now and on every change.
  onChange(cb: (user: SessionUser | null) => void): () => void;
}

export const USERNAME = /^[a-z0-9_]{3,20}$/;

// Supabase accounts need an email, so a username becomes an address nothing is ever sent to.
// `.invalid` is reserved and can never receive mail, so no stranger's inbox gets anything.
const DOMAIN = 'today.invalid';
export const toEmail = (username: string) => `${username.trim().toLowerCase()}@${DOMAIN}`;
export const toUsername = (email: string) => email.split('@')[0];

const reasons: Record<string, AuthFailureReason> = {
  user_already_exists: 'taken',
  email_exists: 'taken',
  weak_password: 'weak',
  invalid_credentials: 'wrong',
  // New sign-ups turned off in the Supabase dashboard: accounts are the owner's only.
  signup_disabled: 'closed',
  email_provider_disabled: 'closed',
};

function check({ error }: { error: { code?: string } | null }) {
  if (error) throw new AuthFailure(reasons[error.code ?? ''] ?? 'other');
}

function emailFor(username: string): string {
  const email = toEmail(username);
  if (!USERNAME.test(toUsername(email))) throw new AuthFailure('username');
  return email;
}

export function supabaseAuth(client: SupabaseClient): AuthApi {
  return {
    async signUp(username, password) {
      const email = emailFor(username);
      // Supabase's own minimum; checked here so the card can say so before any request.
      if (password.length < 6) throw new AuthFailure('weak');
      check(await client.auth.signUp({ email, password }));
    },
    async signIn(username, password) {
      check(await client.auth.signInWithPassword({ email: emailFor(username), password }));
    },
    async signOut() {
      // This device only: other devices stay signed in.
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
    async deleteAccount() {
      const { error } = await client.rpc('delete_account');
      if (error) throw error;
      // The account is gone, so the server may refuse the sign-out; the local session is cleared either way.
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
    },
    onChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        // Never await Supabase inside this callback (it deadlocks): hand over on the next tick.
        setTimeout(() => cb(user ? { id: user.id, username: toUsername(user.email ?? '') } : null), 0);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
