// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncContext, type SyncApi } from '../sync/SyncProvider';
import { AuthFailure } from '../sync/auth';
import { CloudButton } from './CloudButton';

function api(overrides: Partial<SyncApi> = {}): SyncApi {
  return {
    phase: 'signedOut',
    username: null,
    status: 'idle',
    pending: 0,
    online: true,
    signIn: vi.fn(async () => {}),
    signUp: vi.fn(async () => {}),
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

  async function fill(username: string, password: string) {
    await userEvent.type(screen.getByLabelText('Username'), username);
    await userEvent.type(screen.getByLabelText('Password'), password);
  }

  it('signs in with the username and password typed', async () => {
    const value = api();
    show(value);
    await open();
    await fill(' alex ', 'long enough');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(value.signIn).toHaveBeenCalledWith('alex', 'long enough');
  });

  it('creates an account instead', async () => {
    const value = api();
    show(value);
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    await fill('alex', 'long enough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(value.signUp).toHaveBeenCalledWith('alex', 'long enough');
    expect(value.signIn).not.toHaveBeenCalled();
  });

  it('says so when the password is wrong', async () => {
    show(api({ signIn: async () => Promise.reject(new AuthFailure('wrong')) }));
    await open();
    await fill('alex', 'not it at all');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.');
  });

  it('says so when the username is taken', async () => {
    show(api({ signUp: async () => Promise.reject(new AuthFailure('taken')) }));
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    await fill('alex', 'long enough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That username is taken.');
  });

  it('asks before adding lines on this device to the account', async () => {
    const value = api({ phase: 'asking', username: 'alex' });
    show(value);
    await open('Sync (a question is waiting)');
    await userEvent.click(screen.getByRole('button', { name: 'Add them to alex' }));
    expect(value.keepLines).toHaveBeenCalled();
  });

  it('shows changes waiting with a dot and in the card', async () => {
    show(api({ phase: 'signedIn', username: 'alex', pending: 3 }));
    await open('Sync (changes waiting)');
    expect(screen.getByText('Synced as alex')).toBeInTheDocument();
    expect(screen.getByText('3 changes waiting to sync.')).toBeInTheDocument();
  });

  it('warns before signing out with changes that never synced', async () => {
    const signOut = vi.fn(async (force?: boolean) => (force ? null : { unsynced: 2 }));
    show(api({ phase: 'signedIn', username: 'alex', signOut }));
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText("2 changes haven't synced. Sign out and lose them?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out anyway' }));
    expect(signOut).toHaveBeenLastCalledWith(true);
  });

  it("can't sign out while offline", async () => {
    show(api({ phase: 'signedIn', username: 'alex', online: false }));
    await open();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled();
    expect(screen.getByText("Offline. Changes will sync when you're back.")).toBeInTheDocument();
  });

  it('confirms before deleting the account', async () => {
    const value = api({ phase: 'signedIn', username: 'alex' });
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
