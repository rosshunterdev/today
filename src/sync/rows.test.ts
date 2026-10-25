import { describe, it, expect } from 'vitest';
import { fromServer, normaliseTime, toServer } from './rows';
import { makeGoal, makeTask } from '../test/factories';

describe('normaliseTime', () => {
  it.each([
    ['2026-10-25T01:02:03.456+00:00', '2026-10-25T01:02:03.456Z'],
    ['2026-10-25T01:02:03+00:00', '2026-10-25T01:02:03.000Z'],
    ['2026-10-25T01:02:03.45+00:00', '2026-10-25T01:02:03.450Z'],
    ['2026-10-25T01:02:03.456789+00:00', '2026-10-25T01:02:03.456Z'],
    ['2026-10-25T01:02:03.456+00', '2026-10-25T01:02:03.456Z'],
    ['2026-10-25T14:02:03.456+13:00', '2026-10-25T01:02:03.456Z'],
    ['2026-10-25T01:02:03.456Z', '2026-10-25T01:02:03.456Z'],
  ])('%s → %s', (input, out) => {
    expect(normaliseTime(input)).toBe(out);
  });

  it('refuses something that is not a time', () => {
    expect(() => normaliseTime('yesterday')).toThrow();
  });
});

describe('codecs', () => {
  it('sends a task in snake_case, without sync bookkeeping', () => {
    const task = { ...makeTask({ id: 't1', doneAt: null }), dirty: 1, syncedAt: null };
    expect(toServer('tasks', task)).toEqual({
      id: 't1',
      day: '2026-10-01',
      text: task.text,
      done: false,
      done_at: null,
      position: 'a0',
      indent: 0,
      mark: null,
      notes: '',
      created_at: '2026-10-01T00:00:00.000Z',
      updated_at: '2026-10-01T00:00:00.000Z',
      deleted: false,
    });
  });

  it('sends an empty note for rows written before notes existed', () => {
    const goal = makeGoal();
    delete goal.notes;
    expect(toServer('goals', goal).notes).toBe('');
  });

  it('reads a server row back into the local shape with normalised times', () => {
    const row = {
      user_id: 'u1',
      week: '2026-10-19',
      leftovers_dismissed: true,
      updated_at: '2026-10-25T01:02:03+00:00',
      server_updated_at: '2026-10-25T01:02:04.123456+00:00',
    };
    expect(fromServer('weeks', row)).toEqual({ week: '2026-10-19', leftoversDismissed: true, updatedAt: '2026-10-25T01:02:03.000Z' });
  });

  it('round-trips a task', () => {
    const task = makeTask({ mark: 'star', notes: 'note', done: true, doneAt: '2026-10-01T02:00:00.000Z' });
    expect(fromServer('tasks', { ...toServer('tasks', task), server_updated_at: '2026-10-25T00:00:00+00:00' })).toEqual(task);
  });
});
