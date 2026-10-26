import { AuthFailure, type AuthApi, type SessionUser } from '../sync/auth';

export type FakeAuth = AuthApi & { accounts: Map<string, string>; emit(user: SessionUser | null): void };

export function fakeAuth(): FakeAuth {
  let listener: ((user: SessionUser | null) => void) | null = null;
  const fake: FakeAuth = {
    accounts: new Map(),
    emit(user) {
      setTimeout(() => listener?.(user), 0);
    },
    async signUp(username, password) {
      if (fake.accounts.has(username)) throw new AuthFailure('taken');
      if (password.length < 8) throw new AuthFailure('weak');
      fake.accounts.set(username, password);
      fake.emit({ id: 'user-1', username });
    },
    async signIn(username, password) {
      if (fake.accounts.get(username) !== password) throw new AuthFailure('wrong');
      fake.emit({ id: 'user-1', username });
    },
    async signOut() {
      fake.emit(null);
    },
    async deleteAccount() {
      fake.emit(null);
    },
    onChange(cb) {
      listener = cb;
      fake.emit(null);
      return () => {
        listener = null;
      };
    },
  };
  return fake;
}
