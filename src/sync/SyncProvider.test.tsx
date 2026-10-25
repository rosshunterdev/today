// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SyncProvider, useSync, type SyncApi } from './SyncProvider';
import { db } from '../store/db';
import { addTask, listDay } from '../store/tasks';
import { claimDevice, getOwner } from '../store/syncState';
import { toServer } from './rows';
import { fakeAuth, type FakeAuth } from '../test/fakeAuth';
import { fakeRemote, type FakeRemote } from '../test/fakeRemote';
import { makeTask } from '../test/factories';

const DAY = '2026-10-25';
let auth: FakeAuth;
let remote: FakeRemote;
let api: SyncApi;

function Probe() {
  api = useSync();
  return <p data-testid="phase">{api.phase}</p>;
}

function mount(withSync = true) {
  render(
    <SyncProvider auth={withSync ? auth : null} remote={withSync ? remote : null}>
      <Probe />
    </SyncProvider>,
  );
}

const phase = () => screen.getByTestId('phase').textContent;

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  auth = fakeAuth();
  remote = fakeRemote();
});

describe('SyncProvider', () => {
  it('is off without keys', () => {
    mount(false);
    expect(phase()).toBe('off');
  });

  it('signs in with a code on an empty device and brings the lines down', async () => {
    remote.seed('tasks', toServer('tasks', makeTask({ id: 'p', day: DAY, text: 'from my phone' })));
    mount();
    await waitFor(() => expect(phase()).toBe('signedOut'));
    await act(() => api.sendCode('me@example.com'));
    expect(auth.sent).toEqual(['me@example.com']);
    expect(phase()).toBe('codeSent');
    await act(() => api.verifyCode('123456'));
    await waitFor(() => expect(phase()).toBe('signedIn'));
    await waitFor(async () => expect((await listDay(DAY)).map((t) => t.text)).toEqual(['from my phone']));
  });

  it('rejects a wrong code and stays on the code step', async () => {
    mount();
    await waitFor(() => expect(phase()).toBe('signedOut'));
    await act(() => api.sendCode('me@example.com'));
    await expect(api.verifyCode('000000')).rejects.toThrow();
    expect(phase()).toBe('codeSent');
  });

  it('stays on the code step when a late signed-out event arrives', async () => {
    mount();
    await waitFor(() => expect(phase()).toBe('signedOut'));
    await act(() => api.sendCode('me@example.com'));
    auth.emit(null); // Supabase's first event can land after the code was sent
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(phase()).toBe('codeSent');
  });

  it('asks before adding lines already here, and keep sends them up', async () => {
    const t = await addTask(DAY, { text: 'typed before signing in' });
    mount();
    await waitFor(() => expect(phase()).toBe('signedOut'));
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('asking'));
    expect(remote.rows.tasks.size).toBe(0);
    await act(() => api.keepLines());
    await waitFor(() => expect(remote.rows.tasks.get(t.id)?.text).toBe('typed before signing in'));
  });

  it('remove empties the device instead', async () => {
    await addTask(DAY, { text: 'scratch' });
    mount();
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('asking'));
    await act(() => api.removeLines());
    expect(phase()).toBe('signedIn');
    expect(await listDay(DAY)).toEqual([]);
    expect(remote.rows.tasks.size).toBe(0);
  });

  it('signs out after syncing, and empties the device', async () => {
    await claimDevice('user-1');
    mount();
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('signedIn'));
    await addTask(DAY, { text: 'milk' });
    let result: { unsynced: number } | null = { unsynced: -1 };
    await act(async () => {
      result = await api.signOut();
    });
    expect(result).toBeNull();
    expect(remote.rows.tasks.size).toBe(1);
    await waitFor(() => expect(phase()).toBe('signedOut'));
    expect(await db.tasks.count()).toBe(0);
  });

  it("warns instead of signing out when changes can't be sent", async () => {
    await claimDevice('user-1');
    mount();
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('signedIn'));
    remote.push = async () => {
      throw new Error('offline');
    };
    await addTask(DAY, { text: 'milk' });
    let result: { unsynced: number } | null = null;
    await act(async () => {
      result = await api.signOut();
    });
    expect(result).toEqual({ unsynced: 1 });
    expect(phase()).toBe('signedIn');
    expect(await db.tasks.count()).toBe(1);
  });

  it('a lapsed session keeps lines and resumes without asking', async () => {
    await claimDevice('user-1');
    mount();
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('signedIn'));
    await addTask(DAY, { text: 'milk' });
    auth.emit(null); // refresh failed, or signed out elsewhere
    await waitFor(() => expect(phase()).toBe('lapsed'));
    expect(await db.tasks.count()).toBe(1);
    expect(await getOwner()).toBe('user-1');
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('signedIn'));
  });

  it('delete account empties the device', async () => {
    await claimDevice('user-1');
    mount();
    auth.emit({ id: 'user-1', email: 'me@example.com' });
    await waitFor(() => expect(phase()).toBe('signedIn'));
    await addTask(DAY, { text: 'milk' });
    await act(() => api.deleteAccount());
    await waitFor(() => expect(phase()).toBe('signedOut'));
    expect(await db.tasks.count()).toBe(0);
  });
});
