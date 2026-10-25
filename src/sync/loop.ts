const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60_000;
const EDIT_PAUSE_MS = 2_000;

export interface SyncLoop {
  request(): void; // now: start, focus, visible, back online
  requestSoon(): void; // after a pause in editing
  stop(): void;
}

// One sync at a time. A request during a run queues one more run. Failures retry with a growing wait.
export function createSyncLoop(run: () => Promise<void>, report: (ok: boolean) => void): SyncLoop {
  let running = false;
  let again = false;
  let stopped = false;
  let retryMs = FIRST_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let editTimer: ReturnType<typeof setTimeout> | undefined;

  async function go(): Promise<void> {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    clearTimeout(retryTimer);
    running = true;
    try {
      await run();
      retryMs = FIRST_RETRY_MS;
      if (!stopped) report(true);
    } catch {
      again = false;
      if (!stopped) {
        report(false);
        retryTimer = setTimeout(() => void go(), retryMs);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      }
    } finally {
      running = false;
    }
    if (again) {
      again = false;
      void go();
    }
  }

  return {
    request: () => void go(),
    requestSoon() {
      clearTimeout(editTimer);
      editTimer = setTimeout(() => void go(), EDIT_PAUSE_MS);
    },
    stop() {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(editTimer);
    },
  };
}
