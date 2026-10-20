import { describe, it, expect } from 'vitest';
import { isUnfinished } from './leftovers';
import { makeTask } from '../test/factories';

describe('isUnfinished', () => {
  it('is true for an open task with text', () => {
    expect(isUnfinished(makeTask())).toBe(true);
  });
  it('is false when done, deleted, empty or whitespace-only', () => {
    expect(isUnfinished(makeTask({ done: true }))).toBe(false);
    expect(isUnfinished(makeTask({ deleted: true }))).toBe(false);
    expect(isUnfinished(makeTask({ text: '' }))).toBe(false);
    expect(isUnfinished(makeTask({ text: '   ' }))).toBe(false);
  });
});
