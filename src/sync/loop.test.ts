import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSyncLoop } from './loop';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSyncLoop', () => {
  it('runs on request and reports success', async () => {
    const run = vi.fn(async () => {});
    const report = vi.fn();
    createSyncLoop(run, report).request();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(true);
  });

  it('runs one at a time, and once more for requests made during a run', async () => {
    let finish!: () => void;
    const run = vi.fn(() => new Promise<void>((r) => (finish = r)));
    const loop = createSyncLoop(run, () => {});
    loop.request();
    loop.request();
    loop.request();
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('waits for a pause in editing', async () => {
    const run = vi.fn(async () => {});
    const loop = createSyncLoop(run, () => {});
    loop.requestSoon();
    await vi.advanceTimersByTimeAsync(1500);
    loop.requestSoon();
    await vi.advanceTimersByTimeAsync(1500);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('backs off after failures, doubling up to five minutes', async () => {
    const at: number[] = [];
    const run = vi.fn(async () => {
      at.push(Date.now());
      throw new Error('offline');
    });
    const report = vi.fn();
    createSyncLoop(run, report).request();
    await vi.advanceTimersByTimeAsync(0);
    expect(report).toHaveBeenLastCalledWith(false);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    const gaps = at.slice(1).map((t, i) => t - at[i]);
    expect(gaps.slice(0, 9)).toEqual([2000, 4000, 8000, 16_000, 32_000, 64_000, 128_000, 256_000, 300_000]);
    expect(new Set(gaps.slice(8))).toEqual(new Set([300_000]));
  });

  it('skips the wait when asked directly (back online, focus)', async () => {
    let fail = true;
    const run = vi.fn(async () => {
      if (fail) throw new Error('offline');
    });
    const loop = createSyncLoop(run, () => {});
    loop.request();
    await vi.advanceTimersByTimeAsync(0);
    fail = false;
    loop.request();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does nothing after stop', async () => {
    const run = vi.fn(async () => {});
    const loop = createSyncLoop(run, () => {});
    loop.requestSoon();
    loop.stop();
    loop.request();
    await vi.advanceTimersByTimeAsync(5000);
    expect(run).not.toHaveBeenCalled();
  });

  it('tells a run in progress that it has been stopped', async () => {
    let finish!: () => void;
    let active!: () => boolean;
    const loop = createSyncLoop((isActive) => {
      active = isActive;
      return new Promise<void>((r) => (finish = r));
    }, () => {});
    loop.request();
    expect(active()).toBe(true);
    void loop.stop();
    expect(active()).toBe(false);
    finish();
  });

  it('stop waits for a run in progress to finish', async () => {
    let finish!: () => void;
    const loop = createSyncLoop(() => new Promise<void>((r) => (finish = r)), () => {});
    loop.request();
    let stopped = false;
    void loop.stop().then(() => (stopped = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(true);
  });
});
