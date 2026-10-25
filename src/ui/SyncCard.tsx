import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useSync, type SyncApi } from '../sync/SyncProvider';

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

  async function attempt(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
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
      <EmailStep
        intro={
          sync.phase === 'lapsed'
            ? "You were signed out, so changes here aren't syncing. Sign in again to catch up."
            : 'Sign in to see your pages on your other devices.'
        }
        busy={busy}
        onSubmit={(email) => attempt(() => sync.sendCode(email), "Couldn't send a code. Try again in a minute.")}
      />
    );
  } else if (sync.phase === 'codeSent') {
    body = (
      <CodeStep
        email={sync.email ?? ''}
        busy={busy}
        onSubmit={(code) => attempt(() => sync.verifyCode(code), "That code didn't work. Check it, or send a new one.")}
        onRestart={sync.restart}
      />
    );
  } else if (sync.phase === 'asking') {
    body = (
      <>
        <p>This device already has lines on it.</p>
        <div className="sync-actions">
          <button type="button" disabled={busy} onClick={() => attempt(sync.keepLines, "Couldn't do that. Try again.")}>
            Add them to {sync.email}
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
        <p>Synced as {sync.email}</p>
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

function EmailStep({ intro, busy, onSubmit }: { intro: string; busy: boolean; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('');
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(email.trim());
      }}
    >
      <p>{intro}</p>
      <label>
        Email
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <div className="sync-actions">
        <button type="submit" disabled={busy}>
          Send code
        </button>
      </div>
    </form>
  );
}

function CodeStep({ email, busy, onSubmit, onRestart }: { email: string; busy: boolean; onSubmit: (code: string) => void; onRestart: () => void }) {
  const [code, setCode] = useState('');
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(code.trim());
      }}
    >
      <p>We sent a code to {email}.</p>
      <label>
        Code
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          maxLength={10}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <div className="sync-actions">
        <button type="submit" disabled={busy}>
          Sign in
        </button>
        <button type="button" onClick={onRestart}>
          Use another email
        </button>
      </div>
    </form>
  );
}
