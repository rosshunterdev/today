// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarView } from './CalendarView';
import { BinProvider } from './useBin';
import { db } from '../store/db';
import { addTask, listDay, setDone } from '../store/tasks';

const TODAY = '2026-11-11'; // a Wednesday

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

function renderCalendar() {
  render(
    <BinProvider>
      <CalendarView today={TODAY} />
    </BinProvider>,
  );
}

const cell = (name: RegExp) => screen.getByRole('button', { name });
const dayPanel = () => screen.getByRole('region', { name: /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day / });

describe('CalendarView', () => {
  it('opens on this month with today picked', async () => {
    renderCalendar();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('November 2026');
    expect(cell(/^Wednesday 11 November/)).toHaveAttribute('aria-pressed', 'true');
    expect(cell(/^Wednesday 11 November/)).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Wednesday 11 November');
    expect(within(dayPanel()).getByText('Today')).toBeInTheDocument();
  });

  it('writes a line on a coming day', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await user.click(cell(/^Friday 20 November/));
    expect(within(dayPanel()).getByText('In 9 days')).toBeInTheDocument();
    await user.click(await screen.findByRole('textbox', { name: 'New task' }));
    await user.keyboard('dentist 3pm{Enter}');
    await waitFor(async () => expect((await listDay('2026-11-20')).map((t) => t.text)).toEqual(['dentist 3pm']));
    expect(await listDay(TODAY)).toEqual([]);
  });

  it('says in each day’s name how many lines are to do and done', async () => {
    await addTask('2026-11-20', { text: 'dentist' });
    const paid = await addTask('2026-11-20', { text: 'pay rent' });
    await setDone(paid.id, true);
    renderCalendar();
    expect(await screen.findByRole('button', { name: 'Friday 20 November, 1 to do, 1 done' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thursday 19 November' })).toBeInTheDocument();
  });

  it('turns to the months either side and comes back to today', async () => {
    const user = userEvent.setup();
    renderCalendar();
    await user.click(screen.getByRole('button', { name: 'Month after' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('December 2026');
    await user.click(screen.getByRole('button', { name: 'Month before' }));
    await user.click(screen.getByRole('button', { name: 'Month before' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('October 2026');
    await user.click(screen.getByRole('button', { name: 'Go to today' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('November 2026');
    expect(cell(/^Wednesday 11 November/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves the picked day with the arrow keys, into the next month when it has to', async () => {
    const user = userEvent.setup();
    renderCalendar();
    cell(/^Wednesday 11 November/).focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(cell(/^Thursday 12 November/)).toHaveFocus());
    expect(cell(/^Thursday 12 November/)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(cell(/^Thursday 3 December/)).toHaveFocus());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('December 2026');
  });

  it('shows a past day as it was left: no writing line, lines read only', async () => {
    await addTask('2026-11-09', { text: 'return library books' });
    renderCalendar();
    await userEvent.setup().click(cell(/^Monday 9 November/));
    const line = await screen.findByRole('textbox', { name: 'Past task' });
    expect(line).toHaveValue('return library books');
    expect(line).toHaveAttribute('readonly');
    expect(screen.queryByRole('textbox', { name: 'New task' })).not.toBeInTheDocument();
    expect(within(dayPanel()).getByText('2 days ago')).toBeInTheDocument();
  });

  it('sends an open past line to today with >', async () => {
    const user = userEvent.setup();
    await addTask('2026-11-09', { text: 'return library books' });
    renderCalendar();
    await user.click(cell(/^Monday 9 November/));
    await user.click(await screen.findByRole('button', { name: 'Move return library books to today' }));
    await waitFor(async () => expect((await listDay(TODAY)).map((t) => t.text)).toEqual(['return library books']));
    expect(await listDay('2026-11-09')).toEqual([]);
    expect(await screen.findByText('Nothing was written on this day.')).toBeInTheDocument();
  });

  it('says so when a past day has nothing on it', async () => {
    renderCalendar();
    await userEvent.setup().click(cell(/^Monday 2 November/));
    expect(await screen.findByText('Nothing was written on this day.')).toBeInTheDocument();
  });
});
