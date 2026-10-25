import type { AuthApi, SessionUser } from '../sync/auth';

export type FakeAuth = AuthApi & { sent: string[]; emit(user: SessionUser | null): void };

export function fakeAuth(): FakeAuth {
  let listener: ((user: SessionUser | null) => void) | null = null;
  const fake: FakeAuth = {
    sent: [],
    emit(user) {
      setTimeout(() => listener?.(user), 0);
    },
    async sendCode(email) {
      fake.sent.push(email);
    },
    async verifyCode(email, code) {
      if (code !== '123456') throw new Error('Token has expired or is invalid');
      fake.emit({ id: 'user-1', email });
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
