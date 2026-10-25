import type { SupabaseClient } from '@supabase/supabase-js';

export interface SessionUser {
  id: string;
  email: string;
}

export interface AuthApi {
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  // Called with the signed-in user, or null, now and on every change.
  onChange(cb: (user: SessionUser | null) => void): () => void;
}

export function supabaseAuth(client: SupabaseClient): AuthApi {
  return {
    async sendCode(email) {
      // A code, not a link: on iOS a link opens Safari, not the installed app (D-007).
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    async verifyCode(email, code) {
      const { error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
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
        setTimeout(() => cb(user ? { id: user.id, email: user.email ?? '' } : null), 0);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
