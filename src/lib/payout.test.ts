import { describe, expect, it } from 'vitest';
import { cleanAccountNumber, formatDeadline, timeLeft, validatePayout } from './payout';

describe('payout validation', () => {
  const ok = { bank: 'GTBank', accountNumber: '0123456789', accountName: 'Ada Obi' };

  it('accepts a good form', () => {
    expect(validatePayout(ok)).toEqual({});
  });

  it('accepts spaces and dashes in the account number', () => {
    expect(cleanAccountNumber('0123 456-789')).toBe('0123456789');
    expect(validatePayout({ ...ok, accountNumber: '0123 456 789' })).toEqual({});
  });

  it('requires exactly 10 digits', () => {
    expect(validatePayout({ ...ok, accountNumber: '12345' }).accountNumber).toBeTruthy();
    expect(validatePayout({ ...ok, accountNumber: '01234567890' }).accountNumber).toBeTruthy();
    expect(validatePayout({ ...ok, accountNumber: '01234abcde' }).accountNumber).toBeTruthy();
  });

  it('requires a bank and a name', () => {
    expect(validatePayout({ ...ok, bank: '' }).bank).toBeTruthy();
    expect(validatePayout({ ...ok, accountName: ' A ' }).accountName).toBeTruthy();
  });
});

describe('claim deadline helpers', () => {
  const now = new Date('2026-11-23T12:00:00Z');

  it('describes the time left', () => {
    expect(timeLeft('2026-11-30T12:00:00Z', now)).toBe('7 days left');
    expect(timeLeft('2026-11-24T00:00:00Z', now)).toBe('12 hours left');
    expect(timeLeft('2026-11-23T12:40:00Z', now)).toBe('40 minutes left');
  });

  it('returns null once the deadline has passed', () => {
    expect(timeLeft('2026-11-23T11:59:00Z', now)).toBeNull();
  });

  it('formats in Lagos time and flags a passed deadline', () => {
    // 23:30 UTC is 00:30 the next day in Lagos (UTC+1)
    expect(formatDeadline('2026-11-30T23:30:00Z', now)).toMatch(/Tue, 1 Dec/);
    expect(formatDeadline('2026-11-01T10:00:00Z', now)).toMatch(/\(passed\)/);
  });
});
