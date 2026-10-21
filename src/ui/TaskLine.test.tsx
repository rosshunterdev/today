// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotebookPage } from './NotebookPage';
import { TaskLine } from './TaskLine';
import { db } from '../store/db';
import { addTask, listDay, setNotes } from '../store/tasks';

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
    expect(mark()).toHaveTextContent('');
    expect(li(0)).toHaveAttribute('data-mark', 'star');
    expect(li(0).querySelector('.star')).not.toBeNull();
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: bang'));
    expect(mark()).toHaveTextContent('!');
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: question'));
    await user.click(mark());
    await waitFor(() => expect(mark()).toHaveAccessibleName('Mark: none'));
    expect(li(0)).not.toHaveAttribute('data-mark');
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

describe('notes', () => {
  const toggle = () => screen.getByRole('button', { name: 'Notes' });
  const notesBox = () => screen.queryByRole('textbox', { name: 'Notes' });

  it('opens from ✎, saves as you type, keeps Enter inside the note, and folds on Escape', async () => {
    const user = userEvent.setup();
    await renderWith('message manager');
    expect(toggle()).toHaveAttribute('data-has', 'false');
    await user.click(toggle());
    const box = await screen.findByRole('textbox', { name: 'Notes' });
    await user.type(box, 'ask about projects{Enter}will she review it');
    await waitFor(async () => expect((await listDay(DAY))[0].notes).toBe('ask about projects\nwill she review it'));
    expect(lines()).toHaveLength(1);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(notesBox()).toBeNull());
    expect(toggle()).toHaveAttribute('data-has', 'true');
    expect(toggle()).toHaveFocus();
  });

  it('a stroke across the open note never crosses the line off', async () => {
    const user = userEvent.setup();
    await renderWith('gym');
    await user.click(toggle());
    const box = await screen.findByRole('textbox', { name: 'Notes' });
    fireEvent.pointerDown(box, { clientX: 10, clientY: 50, pointerType: 'touch' });
    fireEvent.pointerUp(window, { clientX: 250, clientY: 52, pointerType: 'touch' });
    await pause();
    expect((await listDay(DAY))[0].done).toBe(false);
  });

  it('Backspace on an empty line keeps it when it has a note', async () => {
    const user = userEvent.setup();
    const t = await addTask(DAY, { text: '' });
    await setNotes(t.id, 'call back after 3');
    render(<NotebookPage day={DAY} />);
    await waitFor(() => expect(lines()).toHaveLength(1));
    await user.click(lines()[0]);
    await user.keyboard('{Backspace}');
    await pause();
    expect(await listDay(DAY)).toHaveLength(1);
  });
});

describe('bullets', () => {
  it('shows a dot, then a cross once the line is crossed off', async () => {
    await renderWith('gym');
    expect(li(0).querySelector('.bullet .dot')).not.toBeNull();
    stroke(150, 4);
    await waitFor(() => expect(li(0).querySelector('.bullet svg')).not.toBeNull());
    expect(li(0).querySelector('.bullet .dot')).toBeNull();
  });

  it('clicking the bullet crosses off, and clicking it again undoes it', async () => {
    const user = userEvent.setup();
    await renderWith('gym');
    const bullet = screen.getByRole('button', { name: 'Cross off gym' });
    expect(bullet).toHaveAttribute('aria-pressed', 'false');
    await user.click(bullet);
    await waitFor(() => expect(li(0)).toHaveAttribute('data-done', 'true'));
    expect((await listDay(DAY))[0].done).toBe(true);
    expect(bullet).toHaveAttribute('aria-pressed', 'true');
    await user.click(bullet);
    await waitFor(() => expect(li(0)).toHaveAttribute('data-done', 'false'));
  });

  it('crosses off from the keyboard once the bullet has focus', async () => {
    const user = userEvent.setup();
    await renderWith('gym');
    screen.getByRole('button', { name: 'Cross off gym' }).focus();
    await user.keyboard(' ');
    await waitFor(() => expect(li(0)).toHaveAttribute('data-done', 'true'));
  });
});

describe('TaskLine on an old page', () => {
  const noop = () => {};
  function renderOld(text: string, onMoveToday = noop, onToggleDone = noop) {
    return render(
      <ol>
        <TaskLine
          task={{ id: 'o1', text, done: false }}
          list="old"
          label="Old task"
          readOnly
          coarse={false}
          focusRequested={false}
          onFocusHandled={noop}
          onFocusChange={noop}
          onText={noop}
          onEnter={noop}
          onBackspaceEmpty={noop}
          onToggleDone={onToggleDone}
          onMoveToday={onMoveToday}
        />
      </ol>,
    );
  }

  it('moves to today from its > button, named after the line', async () => {
    const user = userEvent.setup();
    const onMoveToday = vi.fn();
    renderOld('call bank', onMoveToday);
    await user.click(screen.getByRole('button', { name: 'Move call bank to today' }));
    expect(onMoveToday).toHaveBeenCalledTimes(1);
  });

  it('names a blank line by what it is', () => {
    renderOld('');
    expect(screen.getByRole('button', { name: 'Move line to today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cross off line' })).toBeInTheDocument();
  });

  it('crosses off from its bullet, named after the line', async () => {
    const user = userEvent.setup();
    const onToggleDone = vi.fn();
    renderOld('call bank', noop, onToggleDone);
    await user.click(screen.getByRole('button', { name: 'Cross off call bank' }));
    expect(onToggleDone).toHaveBeenCalledTimes(1);
  });
});
