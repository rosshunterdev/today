// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLiveQuery } from 'dexie-react-hooks';
import { OldPages } from './OldPages';
import { db } from '../store/db';
import { addTask } from '../store/tasks';
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
  it('shows the newest page on top and the older one peeking, and raises it on tap', async () => {
    const user = userEvent.setup();
    await addTask(FRI, { text: 'call bank' });
    await addTask(FRI, { text: 'tax form' });
    await addTask(MON, { text: 'email Sam' });
    render(<Live />);
    expect(await screen.findByRole('heading', { name: 'Mon · 1' })).toBeInTheDocument();
    expect(oldLines().map((l) => (l as HTMLInputElement).value)).toEqual(['email Sam']);
    await user.click(screen.getByRole('button', { name: 'Fri · 2' }));
    expect(await screen.findByRole('heading', { name: 'Fri · 2' })).toBeInTheDocument();
    expect(oldLines()).toHaveLength(2);
  });

  it('lines are read-only but cross off with a stroke, and a done page offers the bin', async () => {
    const user = userEvent.setup();
    await addTask(MON, { text: 'email Sam' });
    render(<Live />);
    const input = (await screen.findAllByRole('textbox', { name: 'Old task' }))[0];
    expect(input).toHaveAttribute('readonly');
    fireEvent.pointerDown(input.closest('li')!, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(window, { clientX: 250, clientY: 12 });
    expect(await screen.findByRole('heading', { name: 'Mon · done' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bin page' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Mon · done' })).not.toBeInTheDocument());
    expect(await db.days.get(MON)).toMatchObject({ binned: true });
  });

  it('renders nothing with no pages', () => {
    const { container } = render(<OldPages pages={[]} today={TODAY} />);
    expect(container).toBeEmptyDOMElement();
  });
});
