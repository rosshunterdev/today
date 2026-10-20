// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeSwitch } from './ThemeSwitch';

const themeColor = () => document.querySelector('meta[name="theme-color"]')!.getAttribute('content');

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.head.innerHTML = '<meta name="theme-color" content="#fafaf7">';
});
afterEach(() => vi.restoreAllMocks());

describe('ThemeSwitch', () => {
  it('turns the pages dark and back, and remembers', async () => {
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    const button = screen.getByRole('button', { name: 'Night pages' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('night');
    expect(themeColor()).toBe('#202329');
    expect(localStorage.getItem('today.theme')).toBe('night');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(themeColor()).toBe('#fafaf7');
    expect(localStorage.getItem('today.theme')).toBeNull();
  });

  it('starts at night when night was chosen before', () => {
    localStorage.setItem('today.theme', 'night');
    render(<ThemeSwitch />);
    expect(screen.getByRole('button', { name: 'Night pages' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('night');
  });

  it('still switches for this visit when storage is blocked', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeSwitch />);
    await user.click(screen.getByRole('button', { name: 'Night pages' }));
    expect(document.documentElement.dataset.theme).toBe('night');
  });
});
