import { describe, it, expect } from 'vitest';
import { dayEnd, isPageDone, pageLines } from './pages';
import { makeTask } from '../test/factories';

const DAY = '2026-10-19';
// 2026-10-20 04:00 in Auckland (NZDT, +13) is 15:00 UTC on the 19th.
const END = '2026-10-19T15:00:00.000Z';

describe('dayEnd', () => {
  it('is the 04:00 rollover on the next calendar day', () => {
    expect(dayEnd(DAY)).toBe(END);
  });
});

describe('pageLines', () => {
  it('keeps open lines and lines crossed off after the day ended, in order', () => {
    const tasks = [
      makeTask({ id: 'b', day: DAY, text: 'later', position: 'a2' }),
      makeTask({ id: 'a', day: DAY, text: 'open', position: 'a1' }),
      makeTask({ id: 'c', day: DAY, text: 'crossed next day', done: true, doneAt: END, position: 'a3' }),
    ];
    expect(pageLines(tasks, DAY).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops lines finished on the day itself, deleted, blank, and other days', () => {
    const tasks = [
      makeTask({ day: DAY, done: true, doneAt: '2026-10-19T14:59:59.999Z' }),
      makeTask({ day: DAY, deleted: true }),
      makeTask({ day: DAY, text: '   ' }),
      makeTask({ day: '2026-10-18' }),
    ];
    expect(pageLines(tasks, DAY)).toEqual([]);
  });
});

describe('isPageDone', () => {
  it('is true only when there are lines and all are crossed off', () => {
    expect(isPageDone([])).toBe(false);
    expect(isPageDone([{ done: true }, { done: false }])).toBe(false);
    expect(isPageDone([{ done: true }, { done: true }])).toBe(true);
  });
});
