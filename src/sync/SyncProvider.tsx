import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AuthApi } from './auth';
import type { Remote } from './remote';
import { syncOnce } from './engine';
import { createSyncLoop, type SyncLoop } from './loop';
import { claimDevice, countDirty, getOwner, keepLocalLines, removeLocalLines, wipeLocal } from '../store/syncState';

export type Phase = 'off' | 'signedOut' | 'asking' | 'signedIn' | 'lapsed';
export type Status = 'idle' | 'syncing' | 'synced' | 'failed';

export interface SyncApi {
  phase: Phase;
  username: string | null;
  status: Status;
  pending: number;
  online: boolean;
  signIn(username: string, password: string): Promise<void>;
  signUp(username: string, password: string): Promise<void>;
  keepLines(): Promise<void>;
  removeLines(): Promise<void>;
  signOut(force?: boolean): Promise<{ unsynced: number } | null>;
  deleteAccount(): Promise<void>;
}

const nothing = async () => {};

const OFF: SyncApi = {
  phase: 'off',
  username: null,
  status: 'idle',
  pending: 0,
  online: true,
  signIn: nothing,
  signUp: nothing,
  keepLines: nothing,
  removeLines: nothing,
  signOut: async () => null,
  deleteAccount: nothing,
};

export const SyncContext = createContext<SyncApi>(OFF);
export const useSync = () => useContext(SyncContext);

// Without keys (local-only builds, unit tests) there's no sync at all and the cloud button stays hidden.
export function SyncProvider({ auth, remote, children }: { auth: AuthApi | null; remote: Remote | null; children: ReactNode }) {
  if (!auth || !remote) return <>{children}</>;
  return (
    <Connected auth={auth} remote={remote}>
      {children}
    </Connected>
  );
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

function Connected({ auth, remote, children }: { auth: AuthApi; remote: Remote; children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('signedOut');
  const [username, setUsername] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const online = useOnline();
  const pending = useLiveQuery(countDirty, [], 0);
  const userId = useRef<string | null>(null);
  const leaving = useRef(false); // our own sign-out, as opposed to a lapsed session
  const loop = useRef<SyncLoop | null>(null);

  useEffect(
    () =>
      auth.onChange(async (user) => {
        if (user) {
          setUsername(user.username);
          if (userId.current === user.id) return; // a token refresh, nothing new
          userId.current = user.id;
          setPhase((await claimDevice(user.id)) === 'ask' ? 'asking' : 'signedIn');
          return;
        }
        userId.current = null;
        if (leaving.current) {
          leaving.current = false;
          setPhase('signedOut');
          return;
        }
        // Signed out without asking (refresh failed, deleted elsewhere): this device's lines stay.
        setPhase((await getOwner()) ? 'lapsed' : 'signedOut');
      }),
    [auth],
  );

  useEffect(() => {
    if (phase !== 'signedIn') return;
    const l = createSyncLoop(
      async () => {
        if (!navigator.onLine) throw new Error('offline');
        setStatus('syncing');
        await syncOnce(remote);
      },
      (ok) => setStatus(ok ? 'synced' : 'failed'),
    );
    loop.current = l;
    l.request();
    const now = () => l.request();
    const visible = () => {
      if (document.visibilityState === 'visible') l.request();
    };
    window.addEventListener('focus', now);
    window.addEventListener('online', now);
    document.addEventListener('visibilitychange', visible);
    return () => {
      l.stop();
      loop.current = null;
      window.removeEventListener('focus', now);
      window.removeEventListener('online', now);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [phase, remote]);

  useEffect(() => {
    if (pending > 0) loop.current?.requestSoon();
  }, [pending]);

  async function leave(action: () => Promise<void>) {
    leaving.current = true;
    loop.current?.stop();
    try {
      await action();
    } catch (e) {
      leaving.current = false;
      throw e;
    }
    await wipeLocal();
  }

  const api: SyncApi = {
    phase,
    username,
    status,
    pending,
    online,
    // The session change moves the phase on.
    signIn: (name, password) => auth.signIn(name, password),
    signUp: (name, password) => auth.signUp(name, password),
    async keepLines() {
      await keepLocalLines(userId.current!);
      setPhase('signedIn');
    },
    async removeLines() {
      await removeLocalLines(userId.current!);
      setPhase('signedIn');
    },
    async signOut(force = false) {
      if (!force) {
        await syncOnce(remote).catch(() => {});
        const unsynced = await countDirty();
        if (unsynced > 0) return { unsynced };
      }
      await leave(() => auth.signOut());
      return null;
    },
    deleteAccount: () => leave(() => auth.deleteAccount()),
  };

  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>;
}
