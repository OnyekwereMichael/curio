import { afterEach, describe, expect, it, vi } from 'vitest';

// The module imports the supabase client; the countdown maths below never touches it.
vi.mock('../lib/superbase', () => ({ supabase: {} }));

import { COOLDOWN_SECONDS, formatCountdown, remainingSeconds, snapshot } from './wordCooldown';

afterEach(() => vi.useRealTimers());

describe('word check cooldown countdown', () => {
  it('is 3 minutes', () => {
    expect(COOLDOWN_SECONDS).toBe(180);
  });

  it('formats m:ss', () => {
    expect(formatCountdown(180)).toBe('3:00');
    expect(formatCountdown(161)).toBe('2:41');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
  });

  it('fail, then immediate retry: still locked', () => {
    const snap = snapshot(180, 1_000);
    expect(remainingSeconds(snap, 1_000)).toBe(180);
    expect(remainingSeconds(snap, 2_000)).toBe(179);
  });

  it('retry after navigating away: a re-fetch restarts from the server value, not from zero', () => {
    // Left the page 40s in, came back: the server reports 140s left, so the new snapshot says 140.
    expect(remainingSeconds(snapshot(140, 50_000), 50_000)).toBe(140);
  });

  it('unlocks once 3 minutes have passed', () => {
    const snap = snapshot(180, 0);
    expect(remainingSeconds(snap, 179_000)).toBe(1);
    expect(remainingSeconds(snap, 180_000)).toBe(0);
    expect(remainingSeconds(snap, 999_000)).toBe(0);
  });

  it('no cooldown means not locked', () => {
    expect(remainingSeconds(null)).toBe(0);
  });

  it('device clock manipulation does not move the countdown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T12:00:00Z'));
    const snap = snapshot(180, performance.now());
    const before = remainingSeconds(snap);

    // User sets the phone's clock forward a day: Date jumps, the monotonic clock does not.
    vi.setSystemTime(new Date('2026-11-17T12:00:00Z'));
    expect(remainingSeconds(snap)).toBe(before);
    expect(remainingSeconds(snap)).toBeGreaterThan(0);
  });
});
