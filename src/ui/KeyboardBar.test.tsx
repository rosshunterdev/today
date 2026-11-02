// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotebookPage } from './NotebookPage';
import { db } from '../store/db';
import { addTask, listDay } from '../store/tasks';
import { mockPointerCoarse } from '../test/media';

const DAY = '2026-10-02';
const toolbar = () => screen.queryByRole('toolbar', { name: 'Line tools' });

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
  await addTask(DAY, { text: 'a' });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('KeyboardBar', () => {
  it('appears on a touch device while a line is being edited, and indents it', async () => {
    mockPointerCoarse(true);
    const user = userEvent.setup();
    render(<NotebookPage day={DAY} />);
    const line = await screen.findByRole('textbox', { name: 'Task' });
    expect(toolbar()).toBeNull();
    await user.click(line);
    expect(toolbar()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Make sub-step' }));
    await waitFor(async () => expect((await listDay(DAY))[0].indent).toBe(1));
    expect(line).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Undo sub-step' }));
    await waitFor(async () => expect((await listDay(DAY))[0].indent).toBe(0));
  });

  it('indents the writing line too', async () => {
    mockPointerCoarse(true);
    const user = userEvent.setup();
    render(<NotebookPage day={DAY} />);
    const ghost = await screen.findByRole('textbox', { name: 'New task' });
    await user.click(ghost);
    await user.click(screen.getByRole('button', { name: 'Make sub-step' }));
    await waitFor(() => expect(ghost.closest('li')).toHaveAttribute('data-indent', '1'));
  });

  it('does not indent a heading, like Tab', async () => {
    mockPointerCoarse(true);
    await db.tasks.clear();
    await addTask(DAY, { text: '# Garden' });
    const user = userEvent.setup();
    render(<NotebookPage day={DAY} />);
    await user.click(await screen.findByRole('textbox', { name: 'Heading' }));
    await user.click(screen.getByRole('button', { name: 'Make sub-step' }));
    await new Promise((r) => setTimeout(r, 50));
    expect((await listDay(DAY))[0].indent).toBe(0);
  });

  it('never appears with a mouse/trackpad', async () => {
    mockPointerCoarse(false);
    const user = userEvent.setup();
    render(<NotebookPage day={DAY} />);
    await user.click(await screen.findByRole('textbox', { name: 'Task' }));
    expect(toolbar()).toBeNull();
  });
});
