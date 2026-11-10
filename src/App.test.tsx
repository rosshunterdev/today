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
  window.location.hash = '';
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

  it('turns to the week from the corner button and back, moving focus to each page’s heading', async () => {
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

  it('moves between today and the calendar from the header', async () => {
    const user = userEvent.setup();
    render(<App />);
    const today = screen.getByRole('link', { name: 'Today' });
    const calendar = screen.getByRole('link', { name: 'Calendar' });
    expect(today).toHaveAttribute('aria-current', 'page');

    await user.click(calendar);
    expect(calendar).toHaveAttribute('aria-current', 'page');
    expect(today).not.toHaveAttribute('aria-current');
    expect(await screen.findByRole('button', { name: 'Go to today' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'This week' })).not.toBeInTheDocument();

    await user.click(today);
    expect(await screen.findByRole('heading', { name: 'This week', level: 2 })).toBeInTheDocument();
  });

  it('opens on the calendar when the address says so', async () => {
    window.location.hash = '#calendar';
    render(<App />);
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');
  });

  it('counts old pages on the corner', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 9, 0));
    await addTask('2026-10-19', { text: 'call bank' });
    render(<App />);
    expect(await screen.findByRole('button', { name: 'this week and 1 old page' })).toBeInTheDocument();
  });

  it('shows lines written for tomorrow under Tomorrow, then on today’s page after 04:00', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 22, 21, 0));
    await addTask('2026-10-23', { text: 'reply to Sam' });
    render(<App />);
    expect(await screen.findByRole('textbox', { name: 'Tomorrow task' })).toHaveValue('reply to Sam');
    expect(screen.queryAllByRole('textbox', { name: 'Task' })).toHaveLength(0);

    vi.setSystemTime(new Date(2026, 9, 23, 4, 1));
    act(() => {
      fireEvent(window, new Event('focus'));
    });
    expect(await screen.findByRole('textbox', { name: 'Task' })).toHaveValue('reply to Sam');
    expect(screen.queryAllByRole('textbox', { name: 'Tomorrow task' })).toHaveLength(0);
    expect(await screen.findByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('folds an empty Tomorrow opened by hand when the day turns', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 22, 21, 0));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Tomorrow' }));
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-expanded', 'true');

    vi.setSystemTime(new Date(2026, 9, 23, 4, 1));
    act(() => {
      fireEvent(window, new Event('focus'));
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-expanded', 'false'));
  });
});
