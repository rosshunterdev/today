// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { db } from './store/db';
import { addTask } from './store/tasks';

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('App', () => {
  it('shows the logical day and switches after 04:00 on focus', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 2, 3, 30));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 Thursday October');

    vi.setSystemTime(new Date(2026, 9, 2, 4, 1));
    act(() => {
      fireEvent(window, new Event('focus'));
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2 Friday October');
  });

  it('turns to the week from the folded corner and back, moving focus to each page’s heading', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const book = container.querySelector('.book')!;
    expect(book).toHaveAttribute('data-side', 'today');

    await user.click(await screen.findByRole('button', { name: 'this week' }));
    expect(book).toHaveAttribute('data-side', 'more');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'This week', level: 2 })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'back to today' }));
    expect(book).toHaveAttribute('data-side', 'today');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
  });

  it('counts old pages on the corner', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 9, 0));
    await addTask('2026-10-19', { text: 'call bank' });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'this week and 1 old page' })).toBeInTheDocument();
  });
});
