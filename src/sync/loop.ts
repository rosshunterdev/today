const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 5 * 60_000;
const EDIT_PAUSE_MS = 2_000;

export interface SyncLoop {
  request(): void; // now: start, focus, visible, back online
  requestSoon(): void; // after a pause in editing
  stop(): Promise<void>; // resolves once any run in progress has finished
}

// One sync at a time. A request during a run queues one more run. Failures retry with a growing wait.
// A run is told when the loop stops, so it can leave the device alone from then on.
export function createSyncLoop(run: (active: () => boolean) => Promise<void>, report: (ok: boolean) => void): SyncLoop {
  let running: Promise<void> | null = null;
  let again = false;
  let stopped = false;
  let retryMs = FIRST_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let editTimer: ReturnType<typeof setTimeout> | undefined;
  const active = () => !stopped;

  async function once(): Promise<void> {
    try {
      await run(active);
      retryMs = FIRST_RETRY_MS;
      if (!stopped) report(true);
    } catch {
      again = false;
      if (!stopped) {
        report(false);
        retryTimer = setTimeout(() => void go(), retryMs);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      }
    }
  }

  async function go(): Promise<void> {
    if (stopped) return;
    if (running) {
      again = true;
      return;
    }
    clearTimeout(retryTimer);
    running = once();
    await running;
    running = null;
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
    async stop() {
      stopped = true;
      clearTimeout(retryTimer);
      clearTimeout(editTimer);
      await running;
    },
  };
}
