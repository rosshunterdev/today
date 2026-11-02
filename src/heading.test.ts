import { describe, it, expect } from 'vitest';
import { headingLabel, isHeading } from './heading';

describe('headingLabel', () => {
  it('reads a # and a space at the start', () => {
    expect(headingLabel('# Garden')).toBe('Garden');
    expect(headingLabel('  #   Freelance  ')).toBe('Freelance');
    expect(headingLabel('## Admin')).toBe('Admin');
  });

  it('reads a colon at the end', () => {
    expect(headingLabel('Garden:')).toBe('Garden');
    expect(headingLabel('Support work :  ')).toBe('Support work');
  });

  it('takes off both when both are written', () => {
    expect(headingLabel('# Garden:')).toBe('Garden');
  });

  it('leaves ordinary lines alone', () => {
    expect(headingLabel('#1 call bank')).toBeNull();
    expect(headingLabel('re: invoice')).toBeNull();
    expect(headingLabel('call bank')).toBeNull();
    expect(headingLabel('')).toBeNull();
  });

  it('needs words besides the symbol', () => {
    expect(headingLabel('#')).toBeNull();
    expect(headingLabel('# ')).toBeNull();
    expect(headingLabel(':')).toBeNull();
    expect(headingLabel('  :  ')).toBeNull();
    expect(headingLabel('# :')).toBeNull();
  });
});

describe('isHeading', () => {
  it('is true exactly when there is a label', () => {
    expect(isHeading('Admin:')).toBe(true);
    expect(isHeading('admin')).toBe(false);
  });
});
