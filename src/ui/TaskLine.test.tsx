// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotebookPage } from './NotebookPage';
import { TaskLine } from './TaskLine';
import { db } from '../store/db';
import { addTask, listDay } from '../store/tasks';

const DAY = '2026-10-02';
const lines = () => screen.queryAllByRole('textbox', { name: 'Task' });
const li = (i: number) => lines()[i].closest('li')!;
const pause = () => new Promise((r) => setTimeout(r, 50));

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
});

async function renderWith(text: string) {
  await addTask(DAY, { text });
  render(<NotebookPage day={DAY} />);
  await waitFor(() => expect(lines()).toHaveLength(1));
}

function stroke(dx: number, dy: number) {
  fireEvent.pointerDown(li(0), { clientX: 10, clientY: 10 });
  fireEvent.pointerUp(window, { clientX: 10 + dx, clientY: 10 + dy });
}

describe('crossing off', () => {
  it('a horizontal swipe crosses off, and another undoes it', async () => {
    await renderWith('gym');
    stroke(150, 4);
    await waitFor(() => expect(li(0)).toHaveAttribute('data-done', 'true'));
    expect((await listDay(DAY))[0].done).toBe(true);
    stroke(-150, 0);
    await waitFor(() => expect(li(0)).toHaveAttribute('data-done', 'false'));
  });

  it('a tap, short drag or vertical move does not cross off', async () => {
    await renderWith('gym');
    stroke(0, 0);
    stroke(20, 0);
    stroke(10, 120);
    await pause();
    expect((await listDay(DAY))[0].done).toBe(false);
  });
});

describe('stroke edge cases', () => {
  it('a cancelled stroke (browser took over to scroll) never crosses off later', async () => {
    await renderWith('gym');
    fireEvent.pointerDown(li(0), { clientX: 10, clientY: 10 });
    fireEvent.pointerCancel(window, { clientX: 10, clientY: 60 });
    fireEvent.pointerUp(window, { clientX: 250, clientY: 12 });
    await pause();
    expect((await listDay(DAY))[0].done).toBe(false);
  });

  it('dragging the mouse inside a line being edited selects text instead of crossing off', async () => {
    const user = userEvent.setup();
    await renderWith('reply to Sam');
    await user.click(lines()[0]);
    fireEvent.pointerDown(lines()[0], { clientX: 10, clientY: 10, pointerType: 'mouse' });
    fireEvent.pointerUp(window, { clientX: 160, clientY: 10, pointerType: 'mouse' });
    await pause();
    expect((await listDay(DAY))[0].done).toBe(false);
  });

  it('a finger swipe on a line being edited still crosses off', async () => {
    const user = userEvent.setup();
    await renderWith('reply to Sam');
    await user.click(lines()[0]);
    fireEvent.pointerDown(lines()[0], { clientX: 10, clientY: 10, pointerType: 'touch' });
    fireEvent.pointerUp(window, { clientX: 160, clientY: 10, pointerType: 'touch' });
    await waitFor(() => expect(li(0)).toHaveAttribute('data-done', 'true'));
  });
});

describe('margin marks', () => {
  it('cycles star, bang, question, none', async () => {
    const user = userEvent.setup();
    await renderWith('assignment');
    const mark = () => screen.getByRole('button', { name: /^Mark:/ });
    expect(mark()).toHaveAccessibleName('Mark: none');
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: star'));
    expect(mark()).toHaveTextContent('★');
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: bang'));
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: question'));
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: none'));
  });
});

describe('TaskLine as a goal', () => {
  const noop = () => {};
  function renderGoal() {
    return render(
      <>
        <ol>
          <TaskLine
            task={{ id: 'g1', text: 'assignment', done: false }}
            list="week"
            label="Goal"
            coarse={false}
            focusRequested={false}
            onFocusHandled={noop}
            onFocusChange={noop}
            onText={noop}
            onEnter={noop}
            onBackspaceEmpty={noop}
            onToggleDone={noop}
          />
        </ol>
        <button type="button">after</button>
      </>,
    );
  }

  it('has no margin mark and is labelled as a goal', () => {
    renderGoal();
    expect(screen.getByRole('textbox', { name: 'Goal' })).toHaveValue('assignment');
    expect(screen.queryByRole('button', { name: /^Mark/ })).toBeNull();
  });

  it('lets Tab move focus on instead of indenting', async () => {
    const user = userEvent.setup();
    renderGoal();
    await user.click(screen.getByRole('textbox', { name: 'Goal' }));
    await user.tab();
    // The Reorder handle comes next in the line, then the button after the list.
    if (document.activeElement?.getAttribute('aria-label') === 'Reorder') await user.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });
});
