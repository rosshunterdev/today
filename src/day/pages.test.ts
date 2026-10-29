import { describe, it, expect } from 'vitest';
import { dayEnd, isPageDone, pageLines, pageTitle } from './pages';
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

  it('keeps a line with blank text when it has a note', () => {
    expect(pageLines([makeTask({ day: DAY, text: '', notes: 'call back' })], DAY)).toHaveLength(1);
  });

  it('keeps a heading only when an unfinished line sits under it, before the next heading', () => {
    const tasks = [
      makeTask({ id: 'h1', day: DAY, text: '# Job hunt', position: 'a1' }),
      makeTask({ id: 'cv', day: DAY, text: 'fix CV', position: 'a2' }),
      makeTask({ id: 'h2', day: DAY, text: 'Admin:', position: 'a3' }),
      makeTask({ id: 'gran', day: DAY, text: 'reply to gran', done: true, doneAt: '2026-10-19T09:00:00.000Z', position: 'a4' }),
      makeTask({ id: 'h3', day: DAY, text: '# Freelance', position: 'a5' }),
      makeTask({ id: 'site', day: DAY, text: 'phillips site', done: true, doneAt: END, position: 'a6' }),
      makeTask({ id: 'h4', day: DAY, text: '# Empty', position: 'a7' }),
    ];
    expect(pageLines(tasks, DAY).map((t) => t.id)).toEqual(['h1', 'cv', 'h3', 'site']);
  });

  it('never makes a page from headings alone', () => {
    expect(pageLines([makeTask({ day: DAY, text: '# Job hunt' })], DAY)).toEqual([]);
  });

  it('skips a deleted heading and uses no heading for lines above the first one', () => {
    const tasks = [
      makeTask({ id: 'loose', day: DAY, text: 'buy milk', position: 'a1' }),
      makeTask({ id: 'gone', day: DAY, text: '# Old', deleted: true, position: 'a2' }),
      makeTask({ id: 'cv', day: DAY, text: 'fix CV', position: 'a3' }),
    ];
    expect(pageLines(tasks, DAY).map((t) => t.id)).toEqual(['loose', 'cv']);
  });
});

describe('isPageDone', () => {
  it('is true only when there are lines and all are crossed off', () => {
    expect(isPageDone([])).toBe(false);
    expect(isPageDone([{ done: true, text: 'a' }, { done: false, text: 'b' }])).toBe(false);
    expect(isPageDone([{ done: true, text: 'a' }, { done: true, text: 'b' }])).toBe(true);
  });

  it('ignores headings, which can never be crossed off', () => {
    expect(isPageDone([{ done: false, text: '# Job hunt' }, { done: true, text: 'fix CV' }])).toBe(true);
    expect(isPageDone([{ done: false, text: '# Job hunt' }])).toBe(false);
  });
});

describe('pageTitle', () => {
  it('names the last six days by short weekday and day, and older pages by date', () => {
    expect(pageTitle('2026-10-19', '2026-10-20')).toBe('Mon 19');
    expect(pageTitle('2026-10-14', '2026-10-20')).toBe('Wed 14');
    expect(pageTitle('2026-10-13', '2026-10-20')).toBe('13 Oct');
  });
});
