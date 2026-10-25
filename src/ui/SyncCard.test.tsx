// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncContext, type SyncApi } from '../sync/SyncProvider';
import { CloudButton } from './CloudButton';

function api(overrides: Partial<SyncApi> = {}): SyncApi {
  return {
    phase: 'signedOut',
    email: null,
    status: 'idle',
    pending: 0,
    online: true,
    sendCode: vi.fn(async () => {}),
    verifyCode: vi.fn(async () => {}),
    restart: vi.fn(),
    keepLines: vi.fn(async () => {}),
    removeLines: vi.fn(async () => {}),
    signOut: vi.fn(async () => null),
    deleteAccount: vi.fn(async () => {}),
    ...overrides,
  };
}

function show(value: SyncApi) {
  render(
    <SyncContext.Provider value={value}>
      <CloudButton />
    </SyncContext.Provider>,
  );
}

async function open(name = 'Sync') {
  await userEvent.click(screen.getByRole('button', { name }));
}

describe('CloudButton', () => {
  it('is hidden in a local-only build', () => {
    show(api({ phase: 'off' }));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('sends a code to the email typed', async () => {
    const value = api();
    show(value);
    await open();
    await userEvent.type(screen.getByLabelText('Email', { exact: true }), 'me@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(value.sendCode).toHaveBeenCalledWith('me@example.com');
  });

  it('signs in with the code', async () => {
    const value = api({ phase: 'codeSent', email: 'me@example.com' });
    show(value);
    await open();
    expect(screen.getByText('We sent a code to me@example.com.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Code', { exact: true }), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(value.verifyCode).toHaveBeenCalledWith('123456');
  });

  it('says so when the code is wrong', async () => {
    show(api({ phase: 'codeSent', email: 'me@example.com', verifyCode: async () => Promise.reject(new Error('bad')) }));
    await open();
    await userEvent.type(screen.getByLabelText('Code', { exact: true }), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("That code didn't work.");
  });

  it('asks before adding lines on this device to the account', async () => {
    const value = api({ phase: 'asking', email: 'me@example.com' });
    show(value);
    await open('Sync (a question is waiting)');
    await userEvent.click(screen.getByRole('button', { name: 'Add them to me@example.com' }));
    expect(value.keepLines).toHaveBeenCalled();
  });

  it('shows changes waiting with a dot and in the card', async () => {
    show(api({ phase: 'signedIn', email: 'me@example.com', pending: 3 }));
    await open('Sync (changes waiting)');
    expect(screen.getByText('Synced as me@example.com')).toBeInTheDocument();
    expect(screen.getByText('3 changes waiting to sync.')).toBeInTheDocument();
  });

  it('warns before signing out with changes that never synced', async () => {
    const signOut = vi.fn(async (force?: boolean) => (force ? null : { unsynced: 2 }));
    show(api({ phase: 'signedIn', email: 'me@example.com', signOut }));
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText("2 changes haven't synced. Sign out and lose them?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out anyway' }));
    expect(signOut).toHaveBeenLastCalledWith(true);
  });

  it("can't sign out while offline", async () => {
    show(api({ phase: 'signedIn', email: 'me@example.com', online: false }));
    await open();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled();
    expect(screen.getByText("Offline. Changes will sync when you're back.")).toBeInTheDocument();
  });

  it('confirms before deleting the account', async () => {
    const value = api({ phase: 'signedIn', email: 'me@example.com' });
    show(value);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(value.deleteAccount).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(value.deleteAccount).toHaveBeenCalled();
  });

  it('tells a lapsed session to sign in again', async () => {
    show(api({ phase: 'lapsed' }));
    await open('Sync (signed out)');
    expect(screen.getByText(/Sign in again to catch up/)).toBeInTheDocument();
  });

  it('closes on Escape and gives focus back to the cloud', async () => {
    show(api());
    await open();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sync' })).toHaveFocus();
  });
});
