// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from './App';

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('shows the logical day and switches after 04:00 on focus', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 3, 30));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Thursday');
    expect(screen.getByText('1 Oct')).toBeInTheDocument();

    vi.setSystemTime(new Date(2026, 9, 2, 4, 1));
    act(() => {
      fireEvent(window, new Event('focus'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Friday');
  });
});
