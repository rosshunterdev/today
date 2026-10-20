import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { binPage, listOldPages, pageLineToGoal, pageLineToTask } from './pages';
import { addTask, listDay, setDone, setMark } from './tasks';
import { addGoal, listWeek } from './goals';

const TODAY = '2026-10-20';
const FRI = '2026-10-16';
const MON = '2026-10-19';
const WEEK = '2026-10-19';
const pause = () => new Promise((r) => setTimeout(r, 5));

beforeEach(async () => {
  await Promise.all([db.tasks.clear(), db.days.clear(), db.goals.clear(), db.weeks.clear()]);
});

describe('listOldPages', () => {
  it('lists earlier days with unfinished lines, newest first, skipping today, binned and finished days', async () => {
    await addTask(FRI, { text: 'call bank' });
    await addTask(MON, { text: 'email Sam' });
    await addTask(TODAY, { text: 'new' });
    const done = await addTask('2026-10-15', { text: 'done on the day' });
    // Set doneAt directly: setDone would stamp the real clock, which is after that day ended.
    await db.tasks.update(done.id, { done: true, doneAt: '2026-10-15T10:00:00.000Z' });
    await addTask('2026-10-14', { text: 'binned' });
    await db.days.put({ day: '2026-10-14', binned: true, updatedAt: new Date().toISOString() });
    await addTask('2026-10-13', { text: '   ' });

    const pages = await listOldPages(TODAY);
    expect(pages.map((p) => p.day)).toEqual([MON, FRI]);
    expect(pages[0].lines.map((l) => l.text)).toEqual(['email Sam']);
  });
});

describe('moving a page line', () => {
  it('moves a line onto today between neighbours, open, with indent and mark, and soft-deletes the original', async () => {
    const a = await addTask(TODAY, { text: 'a' });
    const b = await addTask(TODAY, { text: 'b' });
    const line = await addTask(FRI, { text: 'call bank', indent: 1 });
    await setMark(line.id, 'star');
    await setDone(line.id, true); // crossed off on the old page
    const before = (await db.tasks.get(line.id))!.updatedAt;
    await pause();

    const moved = await pageLineToTask(line.id, TODAY, a.id, b.id);
    expect(moved).toMatchObject({ day: TODAY, text: 'call bank', indent: 1, mark: 'star', done: false, doneAt: null });
    expect((await listDay(TODAY)).map((t) => t.text)).toEqual(['a', 'call bank', 'b']);
    const original = (await db.tasks.get(line.id))!;
    expect(original.deleted).toBe(true);
    expect(original.updatedAt > before).toBe(true);
    expect(await listOldPages(TODAY)).toEqual([]);
  });

  it('moves a line into the week as an open goal', async () => {
    const g = await addGoal(WEEK, { text: 'existing' });
    const line = await addTask(FRI, { text: 'book flights' });
    const goal = await pageLineToGoal(line.id, WEEK, g.id, null);
    expect(goal).toMatchObject({ week: WEEK, text: 'book flights', done: false });
    expect((await listWeek(WEEK)).map((x) => x.text)).toEqual(['existing', 'book flights']);
    expect((await db.tasks.get(line.id))!.deleted).toBe(true);
  });

  it('writes nothing when the line was already moved', async () => {
    const line = await addTask(FRI, { text: 'once' });
    await pageLineToTask(line.id, TODAY, null, null);
    expect(await pageLineToTask(line.id, TODAY, null, null)).toBeNull();
    expect(await pageLineToGoal(line.id, WEEK, null, null)).toBeNull();
    expect(await listDay(TODAY)).toHaveLength(1);
    expect(await listWeek(WEEK)).toHaveLength(0);
  });
});

describe('binPage', () => {
  it('marks the day binned and soft-deletes its remaining lines', async () => {
    const open = await addTask(FRI, { text: 'open' });
    await binPage(FRI);
    expect(await db.days.get(FRI)).toMatchObject({ binned: true });
    expect((await db.tasks.get(open.id))!.deleted).toBe(true);
    expect(await listOldPages(TODAY)).toEqual([]);
  });
});
