// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftoversNote } from './LeftoversNote';
import { db } from '../store/db';
import { addTask, listDay, setDone } from '../store/tasks';

const FRI = '2026-10-02';
const THU = '2026-10-01';

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
});

describe('LeftoversNote', () => {
  it('shows nothing when there are no leftovers', async () => {
    const { container } = render(<LeftoversNote today={FRI} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(container).toBeEmptyDOMElement();
  });

  it('offers unfinished tasks and brings over only the picked ones', async () => {
    const user = userEvent.setup();
    const done = await addTask(THU, { text: 'meds' });
    await setDone(done.id, true);
    await addTask(THU, { text: 'gym' });
    await addTask(THU, { text: 'groceries' });
    render(<LeftoversNote today={FRI} />);

    await user.click(await screen.findByRole('button', { name: 'Thursday: 2 left' }));
    expect(screen.getByRole('button', { name: 'Bring over' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'groceries' }));
    await user.click(screen.getByRole('button', { name: 'Bring over' }));

    await waitFor(async () => expect((await listDay(FRI)).map((t) => t.text)).toEqual(['groceries']));
    await waitFor(() => expect(screen.queryByRole('button', { name: /left$/ })).toBeNull());
  });

  it('"Bring all" copies every leftover in order without opening the picker', async () => {
    const user = userEvent.setup();
    await addTask(THU, { text: 'gym' });
    await addTask(THU, { text: 'groceries' });
    await addTask(THU, { text: 'call mum' });
    render(<LeftoversNote today={FRI} />);

    await user.click(await screen.findByRole('button', { name: 'Bring all' }));

    await waitFor(async () =>
      expect((await listDay(FRI)).map((t) => t.text)).toEqual(['gym', 'groceries', 'call mum']),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: /left$/ })).toBeNull());
  });

  it('can be dismissed and stays dismissed', async () => {
    const user = userEvent.setup();
    await addTask(THU, { text: 'gym' });
    const { unmount } = render(<LeftoversNote today={FRI} />);
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull());
    unmount();
    render(<LeftoversNote today={FRI} />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: /left$/ })).toBeNull();
  });

  it('"Not now" closes the picker but keeps the note', async () => {
    const user = userEvent.setup();
    await addTask(THU, { text: 'gym' });
    render(<LeftoversNote today={FRI} />);
    await user.click(await screen.findByRole('button', { name: 'Thursday: 1 left' }));
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByRole('button', { name: 'Thursday: 1 left' })).toBeInTheDocument();
  });

  it('labels leftovers older than 6 days by date, not weekday', async () => {
    await addTask('2026-09-25', { text: 'old thing' });
    render(<LeftoversNote today="2026-10-05" />);
    expect(await screen.findByRole('button', { name: '25 Sept: 1 left' })).toBeInTheDocument();
  });
});
