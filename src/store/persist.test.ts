import { describe, it, expect, afterEach, vi } from 'vitest';
import { requestPersistentStorage } from './persist';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestPersistentStorage', () => {
  it('asks for persistence when not yet persisted', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(false), persist } });
    await requestPersistentStorage();
    expect(persist).toHaveBeenCalledOnce();
  });

  it('does nothing when already persisted', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockResolvedValue(true), persist } });
    await requestPersistentStorage();
    expect(persist).not.toHaveBeenCalled();
  });

  it('never throws when the API is missing or fails', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestPersistentStorage()).resolves.toBeUndefined();
    vi.stubGlobal('navigator', { storage: { persisted: vi.fn().mockRejectedValue(new Error('no')), persist: vi.fn() } });
    await expect(requestPersistentStorage()).resolves.toBeUndefined();
  });
});
