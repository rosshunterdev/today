// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TomorrowSection } from './TomorrowSection';
import { db } from '../store/db';
import { addTask, listDay } from '../store/tasks';
import { mockPointerCoarse } from '../test/media';

const TOMORROW = '2026-10-23';
const toggle = () => screen.queryByRole('button', { name: 'Tomorrow' });
const writing = () => screen.queryByRole('textbox', { name: 'New tomorrow task' });
const lines = () => screen.queryAllByRole('textbox', { name: 'Tomorrow task' });

beforeEach(async () => {
  await db.tasks.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TomorrowSection', () => {
  it('starts folded when tomorrow has no lines', async () => {
    render(<TomorrowSection day={TOMORROW} />);
    expect(await screen.findByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-expanded', 'false');
    expect(writing()).toBeNull();
  });

  it('says its name once: a heading holding the fold button, with no region around it', async () => {
    render(<TomorrowSection day={TOMORROW} />);
    const heading = await screen.findByRole('heading', { name: 'Tomorrow', level: 2 });
    expect(heading).toContainElement(toggle());
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('opens on click with the cursor in its writing line, and folds again while empty', async () => {
    const user = userEvent.setup();
    render(<TomorrowSection day={TOMORROW} />);
    await user.click(await screen.findByRole('button', { name: 'Tomorrow' }));
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(writing()).toHaveFocus());
    expect(writing()).toHaveAttribute('placeholder', "what's on tomorrow?");

    await user.click(toggle()!);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(writing()).toBeNull();
  });

  it('puts the cursor in its writing line on phones too, since a tap opened it', async () => {
    mockPointerCoarse(true);
    const user = userEvent.setup();
    render(<TomorrowSection day={TOMORROW} />);
    await user.click(await screen.findByRole('button', { name: 'Tomorrow' }));
    await waitFor(() => expect(writing()).toHaveFocus());
  });

  it('stores a typed line on tomorrow, then stays open with no fold control', async () => {
    const user = userEvent.setup();
    render(<TomorrowSection day={TOMORROW} />);
    await user.click(await screen.findByRole('button', { name: 'Tomorrow' }));
    await waitFor(() => expect(writing()).toHaveFocus());
    await user.keyboard('reply to Sam{Enter}');

    await waitFor(() => expect(lines()).toHaveLength(1));
    expect((await listDay(TOMORROW)).map((t) => t.text)).toEqual(['reply to Sam']);
    expect(toggle()).toBeNull();
    expect(screen.getByRole('heading', { name: 'Tomorrow', level: 2 })).toBeInTheDocument();
  });

  it('stays open with the cursor in its writing line when its only line is cleared away, then folds by hand', async () => {
    const user = userEvent.setup();
    await addTask(TOMORROW, { text: 'x' });
    render(<TomorrowSection day={TOMORROW} />);
    const line = await screen.findByRole('textbox', { name: 'Tomorrow task' });
    await user.clear(line);
    await user.keyboard('{Backspace}');

    await waitFor(() => expect(lines()).toHaveLength(0));
    await waitFor(() => expect(writing()).toHaveFocus());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle()!);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(writing()).toBeNull();
  });

  it('is open on load when tomorrow already has lines, without taking the cursor', async () => {
    await addTask(TOMORROW, { text: 'review PR' });
    render(<TomorrowSection day={TOMORROW} />);
    expect(await screen.findByDisplayValue('review PR')).toBeInTheDocument();
    expect(toggle()).toBeNull();
    await new Promise((r) => setTimeout(r, 20)); // let any focus effect run
    expect(writing()).not.toHaveFocus();
  });
});
