// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotebookPage } from './NotebookPage';
import { db } from '../store/db';
import { addTask, listDay } from '../store/tasks';
import { mockPointerCoarse } from '../test/media';

const DAY = '2026-10-02';
const lines = () => screen.queryAllByRole('textbox', { name: 'Task' });
const ghost = () => screen.getByRole('textbox', { name: 'New task' });
const li = (i: number) => lines()[i].closest('li')!;

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
});

async function renderPage() {
  render(<NotebookPage day={DAY} />);
  await screen.findByRole('textbox', { name: 'New task' });
}

describe('NotebookPage writing', () => {
  it('shows a prompt on an empty page', async () => {
    await renderPage();
    expect(ghost()).toHaveAttribute('placeholder', "what's on today?");
  });

  it('puts the cursor in the writing line on open (mouse/trackpad devices)', async () => {
    await renderPage();
    await waitFor(() => expect(ghost()).toHaveFocus());
  });

  it('commits the writing line on Enter and stays there', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(ghost());
    await user.keyboard('reply to Sam{Enter}groceries{Enter}');
    await waitFor(() => expect(lines()).toHaveLength(2));
    expect(lines().map((l) => (l as HTMLInputElement).value)).toEqual(['reply to Sam', 'groceries']);
    expect(ghost()).toHaveValue('');
    expect(ghost()).toHaveFocus();
  });

  it('does not commit a blank writing line', async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(ghost());
    await user.keyboard('   {Enter}');
    expect(await listDay(DAY)).toHaveLength(0);
  });

  it('saves typed edits', async () => {
    const user = userEvent.setup();
    await addTask(DAY, { text: 'a' });
    await renderPage();
    await user.type(lines()[0], 'bc');
    await waitFor(async () => expect((await listDay(DAY))[0].text).toBe('abc'));
  });

  it('Enter in a middle line inserts an empty line after it and focuses it', async () => {
    const user = userEvent.setup();
    await addTask(DAY, { text: 'a' });
    await addTask(DAY, { text: 'c' });
    await renderPage();
    await user.click(lines()[0]);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(lines()).toHaveLength(3));
    expect(lines()[1]).toHaveValue('');
    await waitFor(() => expect(lines()[1]).toHaveFocus());
  });

  it('Enter on the last line moves to the writing line', async () => {
    const user = userEvent.setup();
    await addTask(DAY, { text: 'a' });
    await renderPage();
    await user.click(lines()[0]);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(ghost()).toHaveFocus());
    expect(lines()).toHaveLength(1);
  });

  it('Backspace on an empty line deletes it and focuses the previous line', async () => {
    const user = userEvent.setup();
    await addTask(DAY, { text: 'a' });
    await addTask(DAY, { text: '' });
    await renderPage();
    await user.click(lines()[1]);
    await user.keyboard('{Backspace}');
    await waitFor(() => expect(lines()).toHaveLength(1));
    await waitFor(() => expect(lines()[0]).toHaveFocus());
  });

  it('Backspace on the only line deletes it and focuses the writing line', async () => {
    const user = userEvent.setup();
    await addTask(DAY, { text: '' });
    await renderPage();
    await user.click(lines()[0]);
    await user.keyboard('{Backspace}');
    await waitFor(() => expect(lines()).toHaveLength(0));
    await waitFor(() => expect(ghost()).toHaveFocus());
  });

  it('Tab makes a sub-step and Shift+Tab undoes it', async () => {
    const user = userEvent.setup();
    await addTask(DAY, { text: 'a' });
    await renderPage();
    await user.click(lines()[0]);
    await user.keyboard('{Tab}');
    await waitFor(() => expect(li(0)).toHaveAttribute('data-indent', '1'));
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    await waitFor(() => expect(li(0)).toHaveAttribute('data-indent', '0'));
  });
});

describe('NotebookPage for tomorrow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names its lines apart from today’s and uses its own prompt', async () => {
    render(<NotebookPage day={DAY} list="tomorrow" placeholder="what's on tomorrow?" startFocus={false} />);
    const writing = await screen.findByRole('textbox', { name: 'New tomorrow task' });
    expect(writing).toHaveAttribute('placeholder', "what's on tomorrow?");
    await addTask(DAY, { text: 'reply to Sam' });
    expect(await screen.findByRole('textbox', { name: 'Tomorrow task' })).toHaveValue('reply to Sam');
    expect(screen.queryAllByRole('textbox', { name: 'Task' })).toHaveLength(0);
    expect(screen.queryByRole('textbox', { name: 'New task' })).toBeNull();
  });

  it('leaves the cursor alone when startFocus is false, even with a mouse', async () => {
    render(<NotebookPage day={DAY} list="tomorrow" startFocus={false} />);
    const writing = await screen.findByRole('textbox', { name: 'New tomorrow task' });
    await new Promise((r) => setTimeout(r, 20)); // let any focus effect run
    expect(writing).not.toHaveFocus();
  });

  it('takes the cursor when startFocus is true, even on a phone', async () => {
    mockPointerCoarse(true);
    render(<NotebookPage day={DAY} list="tomorrow" startFocus />);
    const writing = await screen.findByRole('textbox', { name: 'New tomorrow task' });
    await waitFor(() => expect(writing).toHaveFocus());
  });
});
