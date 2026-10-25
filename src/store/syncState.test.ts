import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { applyPulled, countDirty, dirtyRows, getWatermark, markPushed, setWatermark } from './syncState';
import { makeTask } from '../test/factories';

const T1 = '2026-10-25T01:00:00.000Z';
const T2 = '2026-10-25T02:00:00.000Z';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('applyPulled', () => {
  it('adds a row the device has never seen, clean', async () => {
    await applyPulled('tasks', [makeTask({ id: 'a', updatedAt: T1 })]);
    expect(await db.tasks.get('a')).toMatchObject({ dirty: 0, syncedAt: T1 });
  });

  it('replaces an older local row', async () => {
    await db.tasks.add(makeTask({ id: 'a', text: 'old', updatedAt: T1 }));
    await applyPulled('tasks', [makeTask({ id: 'a', text: 'new', updatedAt: T2 })]);
    expect(await db.tasks.get('a')).toMatchObject({ text: 'new', dirty: 0 });
  });

  it('keeps a newer local row, still dirty so it goes up', async () => {
    await db.tasks.add(makeTask({ id: 'a', text: 'mine', updatedAt: T2 }));
    await applyPulled('tasks', [makeTask({ id: 'a', text: 'theirs', updatedAt: T1 })]);
    expect(await db.tasks.get('a')).toMatchObject({ text: 'mine', dirty: 1 });
  });

  it('confirms a local row the server already has', async () => {
    await db.tasks.add(makeTask({ id: 'a', updatedAt: T1 }));
    await applyPulled('tasks', [makeTask({ id: 'a', updatedAt: T1 })]);
    expect(await db.tasks.get('a')).toMatchObject({ dirty: 0 });
  });

  it('applies a delete from another device', async () => {
    await applyPulled('tasks', [makeTask({ id: 'a', updatedAt: T1 })]);
    await applyPulled('tasks', [makeTask({ id: 'a', deleted: true, updatedAt: T2 })]);
    expect((await db.tasks.get('a'))!.deleted).toBe(true);
  });
});

describe('push bookkeeping', () => {
  it('lists dirty rows and marks them synced once pushed', async () => {
    await db.tasks.add(makeTask({ id: 'a', updatedAt: T1 }));
    const rows = await dirtyRows('tasks');
    expect(rows.map((r) => r.id)).toEqual(['a']);
    await markPushed('tasks', rows);
    expect(await dirtyRows('tasks')).toEqual([]);
  });

  it('leaves a row dirty when it was edited while the push was in flight', async () => {
    await db.tasks.add(makeTask({ id: 'a', text: 'milk', updatedAt: T1 }));
    const rows = await dirtyRows('tasks');
    await db.tasks.update('a', { text: 'oat milk', updatedAt: T2 });
    await markPushed('tasks', rows);
    expect(await db.tasks.get('a')).toMatchObject({ text: 'oat milk', dirty: 1 });
  });

  it('counts dirty rows across every table', async () => {
    await db.tasks.add(makeTask({ updatedAt: T1 }));
    await db.days.put({ day: '2026-10-25', binned: true, updatedAt: T1 });
    expect(await countDirty()).toBe(2);
  });
});

describe('watermarks', () => {
  it('remembers the newest server time pulled, per table', async () => {
    expect(await getWatermark('tasks')).toBeNull();
    await setWatermark('tasks', T1);
    expect(await getWatermark('tasks')).toBe(T1);
    expect(await getWatermark('goals')).toBeNull();
  });
});
