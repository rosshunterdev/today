import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useSync, type SyncApi } from '../sync/SyncProvider';
import { AuthFailure, type AuthFailureReason } from '../sync/auth';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function statusLine(sync: SyncApi): string {
  if (!sync.online) return "Offline. Changes will sync when you're back.";
  if (sync.status === 'failed') return "Couldn't reach the cloud. Trying again.";
  if (sync.pending > 0) return `${plural(sync.pending, 'change')} waiting to sync.`;
  return 'Everything is synced.';
}

export function SyncCard({ id, onClose }: { id: string; onClose: () => void }) {
  const sync = useSync();
  const card = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unsynced, setUnsynced] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    card.current?.querySelector<HTMLElement>('input, button')?.focus();
  }, [sync.phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: PointerEvent) => {
      if (!card.current?.parentElement?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  async function attempt(action: () => Promise<void>, failure: string | ((e: unknown) => string)) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(typeof failure === 'string' ? failure : failure(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut(force: boolean) {
    await attempt(async () => {
      const result = await sync.signOut(force);
      setUnsynced(result?.unsynced ?? null);
    }, "Couldn't sign out. Check the connection and try again.");
  }

  let body: ReactNode;
  if (sync.phase === 'signedOut' || sync.phase === 'lapsed') {
    body = (
      <AccountStep
        intro={
          sync.phase === 'lapsed'
            ? "You were signed out, so changes here aren't syncing. Sign in again to catch up."
            : 'Sign in to see your pages on your other devices.'
        }
        busy={busy}
        onSubmit={(creating, username, password) =>
          attempt(() => (creating ? sync.signUp : sync.signIn)(username, password), failureText)
        }
      />
    );
  } else if (sync.phase === 'asking') {
    body = (
      <>
        <p>This device already has lines on it.</p>
        <div className="sync-actions">
          <button type="button" disabled={busy} onClick={() => attempt(sync.keepLines, "Couldn't do that. Try again.")}>
            Add them to {sync.username}
          </button>
          <button type="button" disabled={busy} onClick={() => attempt(sync.removeLines, "Couldn't do that. Try again.")}>
            Remove from this device
          </button>
        </div>
      </>
    );
  } else if (confirmDelete) {
    body = (
      <>
        <p>Delete your account and every line in it, on every device? This can't be undone.</p>
        <div className="sync-actions">
          <button type="button" disabled={busy} onClick={() => attempt(sync.deleteAccount, "Couldn't delete the account. Try again.")}>
            Delete everything
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)}>
            Keep it
          </button>
        </div>
      </>
    );
  } else if (unsynced !== null) {
    body = (
      <>
        <p>{plural(unsynced, 'change')} haven't synced. Sign out and lose them?</p>
        <div className="sync-actions">
          <button type="button" disabled={busy} onClick={() => signOut(true)}>
            Sign out anyway
          </button>
          <button type="button" onClick={() => setUnsynced(null)}>
            Stay signed in
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p>Synced as {sync.username}</p>
        <p className="sync-status">{statusLine(sync)}</p>
        <div className="sync-actions">
          <button type="button" disabled={busy || !sync.online} onClick={() => signOut(false)}>
            Sign out
          </button>
          <button type="button" disabled={!sync.online} onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="sync-card" id={id} role="dialog" aria-label="Sync" ref={card}>
      {body}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

const failures: Record<AuthFailureReason, string> = {
  username: 'Usernames are 3 to 20 letters, numbers or _.',
  taken: 'That username is taken. Pick another, or sign in.',
  weak: 'Use a password of at least 8 characters.',
  wrong: 'Wrong username or password.',
  other: "Couldn't reach the cloud. Try again in a minute.",
};

const failureText = (e: unknown) => failures[e instanceof AuthFailure ? e.reason : 'other'];

function AccountStep({
  intro,
  busy,
  onSubmit,
}: {
  intro: string;
  busy: boolean;
  onSubmit: (creating: boolean, username: string, password: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(creating, username.trim(), password);
      }}
    >
      <p>{creating ? "Pick a username and password. There's no reset, so keep the password somewhere safe." : intro}</p>
      <label>
        Username
        <input
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          autoComplete={creating ? 'new-password' : 'current-password'}
          minLength={creating ? 8 : undefined}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <div className="sync-actions">
        <button type="submit" disabled={busy}>
          {creating ? 'Create account' : 'Sign in'}
        </button>
        <button type="button" onClick={() => setCreating((c) => !c)}>
          {creating ? 'Sign in instead' : 'Create an account'}
        </button>
      </div>
    </form>
  );
}
