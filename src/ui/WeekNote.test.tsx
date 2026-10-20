// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekNote } from './WeekNote';
import { db } from '../store/db';
import { addGoal, listWeek } from '../store/goals';

const WEEK = '2026-10-19';
const LAST = '2026-10-12';

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

describe('WeekNote', () => {
  it('heads the section with the week’s dates', async () => {
    render(<WeekNote week={WEEK} />);
    expect(await screen.findByRole('heading', { name: 'This week', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('19 to 25 October')).toBeInTheDocument();
  });

  it('adds a goal from the writing line', async () => {
    const user = userEvent.setup();
    render(<WeekNote week={WEEK} />);
    await user.type(await screen.findByRole('textbox', { name: 'New goal' }), 'work on assignment{Enter}');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Goal' })).toHaveValue('work on assignment'));
    expect((await listWeek(WEEK)).map((g) => g.text)).toEqual(['work on assignment']);
  });

  it('saves a note on a goal', async () => {
    const user = userEvent.setup();
    await addGoal(WEEK, { text: 'assignment' });
    render(<WeekNote week={WEEK} />);
    await user.click(await screen.findByRole('button', { name: 'Notes' }));
    await user.type(await screen.findByRole('textbox', { name: 'Notes' }), 'chapter 2');
    await waitFor(async () => expect((await listWeek(WEEK))[0].notes).toBe('chapter 2'));
  });

  it('crosses a goal off with a stroke', async () => {
    await addGoal(WEEK, { text: 'run 3x' });
    render(<WeekNote week={WEEK} />);
    const input = await screen.findByRole('textbox', { name: 'Goal' });
    fireEvent.pointerDown(input.closest('li')!, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window, { clientX: 250, clientY: 12 });
    await waitFor(async () => expect((await listWeek(WEEK))[0].done).toBe(true));
  });

  it('offers last week’s unfinished goals and brings them all over', async () => {
    const user = userEvent.setup();
    await addGoal(LAST, { text: 'assignment' });
    await addGoal(LAST, { text: 'run 3x' });
    render(<WeekNote week={WEEK} />);
    expect(await screen.findByRole('button', { name: 'Last week: 2 left' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bring all' }));
    await waitFor(async () => expect((await listWeek(WEEK)).map((g) => g.text)).toEqual(['assignment', 'run 3x']));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Bring all' })).not.toBeInTheDocument());
  });
});
