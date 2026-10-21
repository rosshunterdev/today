import { describe, it, expect, vi } from 'vitest';
import { checkForUpdates } from './checkForUpdates';

function fakeDocument(visibilityState: DocumentVisibilityState) {
  return Object.assign(new EventTarget(), { visibilityState });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('checkForUpdates', () => {
  it('asks for a new version when the app comes back to the front', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const doc = fakeDocument('visible');
    checkForUpdates({ update }, doc);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(update).toHaveBeenCalledOnce();
  });

  it('does nothing as the app goes into the background', () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const doc = fakeDocument('hidden');
    checkForUpdates({ update }, doc);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(update).not.toHaveBeenCalled();
  });

  it('ignores a check that fails, as it does offline', async () => {
    // A plain function, not vi.fn: a mock records its promise's result, which would quietly handle the rejection.
    let calls = 0;
    const update = () => {
      calls++;
      return Promise.reject(new Error('offline'));
    };
    const doc = fakeDocument('visible');
    checkForUpdates({ update }, doc);
    doc.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(calls).toBe(1);
  });
});
