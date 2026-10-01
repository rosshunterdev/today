// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotebookPage } from './NotebookPage';
import { db } from '../store/db';
import { addTask } from '../store/tasks';
import { mockPointerCoarse } from '../test/media';

const DAY = '2026-10-02';

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
  await addTask(DAY, { text: 'a' });
  await addTask(DAY, { text: 'b' });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('reorder affordance', () => {
  it('shows a handle per line on a mouse/trackpad device', async () => {
    mockPointerCoarse(false);
    render(<NotebookPage day={DAY} />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Reorder' })).toHaveLength(2));
  });

  it('shows no handle on a touch device', async () => {
    mockPointerCoarse(true);
    render(<NotebookPage day={DAY} />);
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Task' })).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Reorder' })).toBeNull();
  });
});
