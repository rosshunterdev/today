import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../store/db';
import { addTask, listDay, updateText } from '../store/tasks';
import { countDirty } from '../store/syncState';
import { toServer } from './rows';
import { syncOnce } from './engine';
import { fakeRemote, type FakeRemote } from '../test/fakeRemote';
import { makeTask } from '../test/factories';

const DAY = '2026-10-25';
let remote: FakeRemote;

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  remote = fakeRemote();
});

describe('syncOnce', () => {
  it("sends this device's lines up and marks them synced", async () => {
    const t = await addTask(DAY, { text: 'milk' });
    await syncOnce(remote);
    expect(remote.rows.tasks.get(t.id)!.text).toBe('milk');
    expect(await countDirty()).toBe(0);
  });

  it("brings another device's lines down", async () => {
    remote.seed('tasks', toServer('tasks', makeTask({ id: 'other', day: DAY, text: 'from my phone' })));
    await syncOnce(remote);
    expect((await listDay(DAY)).map((t) => t.text)).toEqual(['from my phone']);
    expect(await countDirty()).toBe(0);
  });

  it('keeps the newer edit on both sides', async () => {
    const t = await addTask(DAY, { text: 'milk' });
    await syncOnce(remote);
    remote.seed('tasks', { ...remote.rows.tasks.get(t.id)!, text: 'from phone', updated_at: '2099-01-01T00:00:00.000Z' });
    await syncOnce(remote);
    expect((await db.tasks.get(t.id))!.text).toBe('from phone');

    await updateText(t.id, 'typed here, later than nothing on the server');
    await syncOnce(remote);
    // The server's copy is dated 2099, so the device's edit (dated now) loses there and is replaced here next pull.
    await syncOnce(remote);
    expect((await db.tasks.get(t.id))!.text).toBe('from phone');
  });

  it('carries deletes to the other device', async () => {
    remote.seed('tasks', toServer('tasks', makeTask({ id: 'x', day: DAY, updatedAt: '2026-10-25T01:00:00.000Z' })));
    await syncOnce(remote);
    remote.seed('tasks', toServer('tasks', makeTask({ id: 'x', day: DAY, deleted: true, updatedAt: '2026-10-25T02:00:00.000Z' })));
    await syncOnce(remote);
    expect(await listDay(DAY)).toEqual([]);
  });

  it('leaves an edit made during a push dirty, and sends it next time', async () => {
    const t = await addTask(DAY, { text: 'milk' });
    remote.beforePush = async () => {
      remote.beforePush = undefined;
      await new Promise((r) => setTimeout(r, 2));
      await updateText(t.id, 'oat milk');
    };
    await syncOnce(remote);
    expect(await countDirty()).toBe(1);
    await syncOnce(remote);
    expect(remote.rows.tasks.get(t.id)!.text).toBe('oat milk');
    expect(await countDirty()).toBe(0);
  });

  it('repairs duplicate positions after a pull, and sends the repair up', async () => {
    const mine = await addTask(DAY, { text: 'mine' });
    remote.seed('tasks', toServer('tasks', makeTask({ id: 'zzz-theirs', day: DAY, position: mine.position, text: 'theirs' })));
    await syncOnce(remote);
    const lines = await listDay(DAY);
    expect(lines.map((l) => l.text).sort()).toEqual(['mine', 'theirs']);
    expect(lines[0].position).not.toBe(lines[1].position);
    await syncOnce(remote);
    expect(remote.rows.tasks.get('zzz-theirs')!.position).toBe((await db.tasks.get('zzz-theirs'))!.position);
  });

  it('pulls in pages', async () => {
    for (let i = 0; i < 5; i++) remote.seed('tasks', toServer('tasks', makeTask({ id: `r${i}`, day: DAY, position: `a${i}` })));
    await syncOnce(remote, { pageSize: 2 });
    expect(await listDay(DAY)).toHaveLength(5);
  });

  it('pulls from a minute before the last change it saw', async () => {
    remote.seed('tasks', toServer('tasks', makeTask({ id: 'a', day: DAY })));
    await syncOnce(remote);
    remote.pulls.length = 0;
    await syncOnce(remote);
    const since = remote.pulls.find((p) => p.table === 'tasks')!.since!;
    const newest = Date.parse(remote.rows.tasks.get('a')!.server_updated_at);
    expect(Date.parse(since)).toBe(newest - 60_000);
  });

  it('loses nothing when the server is unreachable', async () => {
    await addTask(DAY, { text: 'milk' });
    remote.pull = async () => {
      throw new Error('offline');
    };
    await expect(syncOnce(remote)).rejects.toThrow('offline');
    expect(await countDirty()).toBe(1);
  });
});
