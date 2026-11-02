import { describe, it, expect } from 'vitest';
import { hasNotes, isUnfinished } from './leftovers';
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
  it('counts a blank line with a note as unfinished, but not whitespace-only notes', () => {
    expect(isUnfinished(makeTask({ text: '', notes: 'call back after 3' }))).toBe(true);
    expect(isUnfinished(makeTask({ text: '', notes: '  \n ' }))).toBe(false);
  });
  it('never counts a heading, so last week’s headings are not offered again', () => {
    expect(isUnfinished(makeTask({ text: 'Garden:' }))).toBe(false);
    expect(isUnfinished(makeTask({ text: '# Admin', notes: 'gifts' }))).toBe(false);
  });
});

describe('hasNotes', () => {
  it('is true only for notes with visible text', () => {
    expect(hasNotes('ask about projects')).toBe(true);
    expect(hasNotes(' \n ')).toBe(false);
    expect(hasNotes('')).toBe(false);
    expect(hasNotes(undefined)).toBe(false);
  });
});
