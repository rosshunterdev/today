// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTheme, setTheme } from './theme';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('theme', () => {
  it('is day until night is chosen, and remembers the choice', () => {
    expect(getTheme()).toBe('day');
    setTheme('night');
    expect(getTheme()).toBe('night');
    expect(localStorage.getItem('today.theme')).toBe('night');
    setTheme('day');
    expect(getTheme()).toBe('day');
    expect(localStorage.getItem('today.theme')).toBeNull();
  });

  it('reads anything unexpected as day', () => {
    localStorage.setItem('today.theme', 'sepia');
    expect(getTheme()).toBe('day');
  });

  it('falls back to day, and never throws, when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    expect(getTheme()).toBe('day');
    expect(() => setTheme('night')).not.toThrow();
    expect(() => setTheme('day')).not.toThrow();
  });
});
