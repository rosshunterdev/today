// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { OldPages } from './OldPages';
import { db } from '../store/db';
import { addTask, listDay, setNotes } from '../store/tasks';
import { listOldPages } from '../store/pages';

const TODAY = '2026-10-20';
const MON = '2026-10-19';
const FRI = '2026-10-16';

function Live() {
  const pages = useLiveQuery(() => listOldPages(TODAY), []);
  return pages ? <OldPages pages={pages} today={TODAY} /> : null;
}

const oldLines = () => screen.queryAllByRole('textbox', { name: 'Old task' });

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

describe('OldPages', () => {
  it('lists every page, newest first, by short weekday and day', async () => {
    await addTask(FRI, { text: 'call bank' });
    await addTask(FRI, { text: 'tax form' });
    await addTask(MON, { text: 'email Sam' });
    render(<Live />);
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Mon 19', 'Fri 16']));
    expect(oldLines().map((l) => (l as HTMLInputElement).value)).toEqual(['email Sam', 'call bank', 'tax form']);
  });

  it('names a page older than six days by its date', async () => {
    await addTask('2026-10-12', { text: 'renew rego' });
    render(<Live />);
    expect(await screen.findByRole('heading', { name: '12 Oct' })).toBeInTheDocument();
  });

  it('lines are read-only but cross off with a stroke, and a done page offers the bin', async () => {
    const user = userEvent.setup();
    await addTask(MON, { text: 'email Sam' });
    render(<Live />);
    const input = (await screen.findAllByRole('textbox', { name: 'Old task' }))[0];
    expect(input).toHaveAttribute('readonly');
    fireEvent.pointerDown(input.closest('li')!, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window, { clientX: 250, clientY: 12 });
    await waitFor(() => expect(input.closest('article')).toHaveAttribute('data-done', 'true'));
    await user.click(screen.getByRole('button', { name: 'bin page' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Mon 19' })).not.toBeInTheDocument());
    expect(await db.days.get(MON)).toMatchObject({ binned: true });
  });

  it('asks for a second tap before binning a page that still has open lines', async () => {
    const user = userEvent.setup();
    await addTask(MON, { text: 'email Sam' });
    await addTask(MON, { text: 'call bank' });
    render(<Live />);
    await user.click(await screen.findByRole('button', { name: 'bin page' }));
    expect(await db.days.get(MON)).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'bin 2 open lines?' }));
    await waitFor(async () => expect(await db.days.get(MON)).toMatchObject({ binned: true }));
  });

  it('sends a line to the end of today with >', async () => {
    const user = userEvent.setup();
    await addTask(TODAY, { text: 'groceries' });
    await addTask(MON, { text: 'email Sam' });
    render(<Live />);
    await user.click(await screen.findByRole('button', { name: 'Move email Sam to today' }));
    await waitFor(async () => expect((await listDay(TODAY)).map((t) => t.text)).toEqual(['groceries', 'email Sam']));
    await waitFor(() => expect(oldLines()).toHaveLength(0));
  });

  it('keeps keyboard focus on the old pages after >: the next line’s >, then the week heading', async () => {
    const user = userEvent.setup();
    await addTask(MON, { text: 'email Sam' });
    await addTask(MON, { text: 'call bank' });
    render(
      <>
        <h2 id="week-heading" tabIndex={-1}>
          This week
        </h2>
        <Live />
      </>,
    );
    (await screen.findByRole('button', { name: 'Move email Sam to today' })).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Move call bank to today' })).toHaveFocus();
    // Pressed again before the first line has gone: the > on its way out is skipped.
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'This week' })).toHaveFocus();
    await waitFor(() => expect(oldLines()).toHaveLength(0));
  });

  it('shows the pencil only on lines with notes, and the note is open and read-only', async () => {
    const t = await addTask(MON, { text: 'email Sam' });
    await setNotes(t.id, 'ask about the invoice');
    await addTask(MON, { text: 'call bank' });
    render(<Live />);
    const toggles = await screen.findAllByRole('button', { name: /^Notes for / });
    expect(toggles).toHaveLength(1);
    const box = await screen.findByRole('textbox', { name: 'Notes for email Sam' });
    expect(box).toHaveValue('ask about the invoice');
    expect(box).toHaveAttribute('readonly');
  });

  it('shows a heading above its open line, and the bin count leaves headings out', async () => {
    const user = userEvent.setup();
    await addTask(MON, { text: '# Garden' });
    await addTask(MON, { text: 'mow lawn' });
    await addTask(MON, { text: 'apply to Xero' });
    render(<Live />);
    expect(await screen.findByRole('textbox', { name: 'Heading' })).toHaveValue('Garden');
    expect(oldLines()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'bin page' }));
    expect(screen.getByRole('button', { name: 'bin 2 open lines?' })).toBeInTheDocument();
  });

  it('renders nothing with no pages', () => {
    const { container } = render(<OldPages pages={[]} today={TODAY} />);
    expect(container).toBeEmptyDOMElement();
  });
});
