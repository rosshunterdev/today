// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BinProvider, SLIP_MS, useBin, type BinApi, type BinnedLine } from './useBin';
import { deleteTask, restoreTask } from '../store/tasks';
import { deleteGoal, restoreGoal } from '../store/goals';

vi.mock('../store/tasks', () => ({ deleteTask: vi.fn(async () => {}), restoreTask: vi.fn(async () => {}) }));
vi.mock('../store/goals', () => ({ deleteGoal: vi.fn(async () => {}), restoreGoal: vi.fn(async () => {}) }));

let api: BinApi;
function Grab() {
  api = useBin();
  return null;
}

const milk: BinnedLine = { from: 'today', id: 't1', text: 'buy milk' };

async function binLine(line: BinnedLine) {
  await act(async () => {
    await api.bin(line);
  });
}

const undoButton = () => screen.queryByRole('button', { name: 'undo' });
const slip = () => screen.getByText(/binned/).closest('p')!;
const later = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  render(
    <BinProvider>
      <Grab />
    </BinProvider>,
  );
});
afterEach(() => {
  vi.useRealTimers();
});

describe('bin', () => {
  it('bins a today line and shows a slip with its words', async () => {
    await binLine(milk);
    expect(deleteTask).toHaveBeenCalledWith('t1');
    expect(screen.getByRole('status')).toHaveTextContent('binned “buy milk”');
  });

  it('throws a week goal away from the goals table, and an old line from the tasks table', async () => {
    await binLine({ from: 'week', id: 'g1', text: 'run 3x' });
    expect(deleteGoal).toHaveBeenCalledWith('g1');
    expect(deleteTask).not.toHaveBeenCalled();
    await binLine({ from: 'old', id: 'o1', text: 'call bank' });
    expect(deleteTask).toHaveBeenCalledWith('o1');
  });

  it('names a line with no words "a line"', async () => {
    await binLine({ from: 'today', id: 't2', text: '   ' });
    expect(screen.getByRole('status')).toHaveTextContent('binned a line');
  });

  it('takes the slip away after 5 seconds', async () => {
    await binLine(milk);
    later(SLIP_MS - 1);
    expect(undoButton()).not.toBeNull();
    later(1);
    expect(undoButton()).toBeNull();
  });

  it('holds the slip while the pointer is on it', async () => {
    await binLine(milk);
    fireEvent.pointerEnter(slip());
    later(SLIP_MS * 2);
    expect(undoButton()).not.toBeNull();
    fireEvent.pointerLeave(slip());
    later(SLIP_MS);
    expect(undoButton()).toBeNull();
  });

  it('holds the slip while its undo has focus', async () => {
    await binLine(milk);
    fireEvent.focus(undoButton()!);
    later(SLIP_MS * 2);
    expect(undoButton()).not.toBeNull();
    fireEvent.blur(undoButton()!);
    later(SLIP_MS);
    expect(undoButton()).toBeNull();
  });

  it('a second bin replaces the first, and undo brings back only the last', async () => {
    await binLine(milk);
    await binLine({ from: 'today', id: 't2', text: 'call bank' });
    expect(screen.getByRole('status')).toHaveTextContent('binned “call bank”');
    fireEvent.click(undoButton()!);
    expect(restoreTask).toHaveBeenCalledTimes(1);
    expect(restoreTask).toHaveBeenCalledWith('t2');
    expect(undoButton()).toBeNull();
  });

  it('restores a week goal to the goals table', async () => {
    await binLine({ from: 'week', id: 'g1', text: 'run 3x' });
    fireEvent.click(undoButton()!);
    expect(restoreGoal).toHaveBeenCalledWith('g1');
    expect(restoreTask).not.toHaveBeenCalled();
  });

  it('Ctrl+Z or ⌘Z undoes the bin while the slip shows, and is left alone once it has gone', async () => {
    await binLine(milk);
    expect(fireEvent.keyDown(window, { key: 'z', ctrlKey: true })).toBe(false); // the browser's undo is stopped
    expect(restoreTask).toHaveBeenCalledWith('t1');

    await binLine(milk);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(restoreTask).toHaveBeenCalledTimes(2);

    await binLine(milk);
    later(SLIP_MS);
    expect(fireEvent.keyDown(window, { key: 'z', ctrlKey: true })).toBe(true); // typing undo still works
    expect(restoreTask).toHaveBeenCalledTimes(2);
  });

  it('starts the count afresh for the next bin after an undo from the slip', async () => {
    // Clicking undo removes the slip from under the pointer, so it never hears the pointer leave.
    await binLine(milk);
    fireEvent.pointerEnter(slip());
    fireEvent.click(undoButton()!);
    await binLine(milk);
    later(SLIP_MS);
    expect(undoButton()).toBeNull();
  });
});
