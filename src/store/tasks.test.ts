import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from './db';
import { listDay, addTask, updateText, setIndent, setMark, setDone, deleteTask, moveTask, restoreTask } from './tasks';

const DAY = '2026-10-02';
const texts = async () => (await listDay(DAY)).map((t) => t.text);

beforeEach(async () => {
  await db.tasks.clear();
  await db.days.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('tasks store', () => {
  it('appends tasks in order', async () => {
    await addTask(DAY, { text: 'a' });
    await addTask(DAY, { text: 'b' });
    expect(await texts()).toEqual(['a', 'b']);
  });

  it('gives distinct, ordered positions to tasks added at the same moment', async () => {
    await Promise.all([addTask(DAY, { text: 'a' }), addTask(DAY, { text: 'b' }), addTask(DAY, { text: 'c' })]);
    const rows = await listDay(DAY);
    expect(new Set(rows.map((t) => t.position)).size).toBe(3);
    expect(rows.map((t) => t.text)).toEqual(['a', 'b', 'c']);
  });

  it('inserts after a given task', async () => {
    const a = await addTask(DAY, { text: 'a' });
    await addTask(DAY, { text: 'c' });
    await addTask(DAY, { afterId: a.id, text: 'b', indent: 1 });
    expect(await texts()).toEqual(['a', 'b', 'c']);
    expect((await listDay(DAY))[1].indent).toBe(1);
  });

  it('lists only the given day and hides deleted tasks', async () => {
    const a = await addTask(DAY, { text: 'a' });
    await addTask('2026-10-01', { text: 'other day' });
    await addTask(DAY, { text: 'b' });
    await deleteTask(a.id);
    expect(await texts()).toEqual(['b']);
    expect((await db.tasks.get(a.id))?.deleted).toBe(true);
  });

  it('records done time and bumps updatedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T09:00:00.000Z'));
    const a = await addTask(DAY, { text: 'a' });
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'));
    await setDone(a.id, true);
    let row = await db.tasks.get(a.id);
    expect(row).toMatchObject({ done: true, doneAt: '2026-10-02T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' });
    await setDone(a.id, false);
    row = await db.tasks.get(a.id);
    expect(row).toMatchObject({ done: false, doneAt: null });
  });

  it('updates text, indent and mark', async () => {
    const a = await addTask(DAY, { text: 'a' });
    await updateText(a.id, 'abc');
    await setIndent(a.id, 1);
    await setMark(a.id, 'star');
    expect(await db.tasks.get(a.id)).toMatchObject({ text: 'abc', indent: 1, mark: 'star' });
  });

  it('moves a task between two others', async () => {
    const a = await addTask(DAY, { text: 'a' });
    const b = await addTask(DAY, { text: 'b' });
    const c = await addTask(DAY, { text: 'c' });
    await moveTask(c.id, a.id, b.id);
    expect(await texts()).toEqual(['a', 'c', 'b']);
    await moveTask(a.id, b.id, null);
    expect(await texts()).toEqual(['c', 'b', 'a']);
  });

  it('restores a deleted task to its old place, bumping updatedAt', async () => {
    await addTask(DAY, { text: 'a' });
    const b = await addTask(DAY, { text: 'b' });
    await addTask(DAY, { text: 'c' });
    await deleteTask(b.id);
    expect(await texts()).toEqual(['a', 'c']);
    const deletedAt = (await db.tasks.get(b.id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await restoreTask(b.id);
    expect(await texts()).toEqual(['a', 'b', 'c']);
    expect((await db.tasks.get(b.id))!.updatedAt > deletedAt).toBe(true);
  });

  it('restores a line just before a line written into its place since, so Enter after either still works', async () => {
    await addTask(DAY, { text: 'a' });
    const b = await addTask(DAY, { text: 'b' });
    await deleteTask(b.id);
    const c = await addTask(DAY, { text: 'c' }); // takes the place b left
    await restoreTask(b.id);
    const rows = await listDay(DAY);
    expect(new Set(rows.map((t) => t.position)).size).toBe(3);
    expect(rows.map((t) => t.text)).toEqual(['a', 'b', 'c']);
    await addTask(DAY, { afterId: b.id, text: 'after b' });
    await addTask(DAY, { afterId: c.id, text: 'after c' });
    expect(await texts()).toEqual(['a', 'b', 'after b', 'c', 'after c']);
  });
});
