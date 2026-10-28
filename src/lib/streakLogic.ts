// The streak rules, kept free of UI and database code so they can be tested.
// All dates are 'YYYY-MM-DD' strings (UTC), matching the rest of the app.

export const MAX_SHIELDS = 2;
export const SHIELD_EVERY_DAYS = 7;

// A streak shorter than this resets quietly, with no loss screen. Early on
// there is little to mourn and nothing to restore, so we don't discourage
// newcomers. Set to 1 if you want the loss screen for every lost streak.
export const MIN_LOSS_STREAK = 3;

export interface StreakRow {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // last day a quiz was completed (or covered by a shield)
  shieldCount: number;
  lostStreak: number; // streak that just ended and can still be restored (0 = none)
}

export function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / 86400000);
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

// Full days with no completed quiz. Finished yesterday or today = 0.
export function missedDaysSince(lastActiveDate: string | null, today: string): number {
  if (!lastActiveDate) return 0;
  return Math.max(0, daysBetween(lastActiveDate, today) - 1);
}

// Runs when the app opens. If a day was missed, the streak resets to 0 right
// away, and the old number is remembered so a shield can bring it back.
export function reconcile(row: StreakRow, today: string) {
  const missed = missedDaysSince(row.lastActiveDate, today);

  if (missed === 0) {
    // Streak is intact. Clear any stale leftover, just in case.
    return { changed: row.lostStreak !== 0, currentStreak: row.currentStreak, lostStreak: 0 };
  }

  if (row.currentStreak > 0) {
    // First time we notice the break.
    return {
      changed: true,
      currentStreak: 0,
      lostStreak: row.currentStreak >= MIN_LOSS_STREAK ? row.currentStreak : 0,
    };
  }

  // Already reset on an earlier visit. Keep any pending restore as it is.
  return { changed: false, currentStreak: 0, lostStreak: row.lostStreak };
}

// Using shields to bring a lost streak back. One shield per missed day.
export function recover(row: StreakRow, today: string) {
  const missed = missedDaysSince(row.lastActiveDate, today);

  if (row.lostStreak <= 0 || missed <= 0) {
    return { ok: false as const, reason: 'nothing-to-restore' as const };
  }
  if (row.shieldCount < missed) {
    return { ok: false as const, reason: 'not-enough-shields' as const };
  }

  return {
    ok: true as const,
    newStreak: row.lostStreak,
    newShieldCount: row.shieldCount - missed,
    shieldsUsed: missed,
    // The covered days now count as kept, so finishing today's quiz is a normal +1.
    newLastActiveDate: shiftDate(today, -1),
  };
}

// Runs when a quiz is completed. Today's completion is the only thing that adds a day.
export function commit(row: StreakRow, today: string) {
  if (row.lastActiveDate && daysBetween(row.lastActiveDate, today) <= 0) {
    return { skipped: true as const }; // already counted today
  }

  let newStreak: number;
  if (!row.lastActiveDate) {
    newStreak = 1;
  } else if (daysBetween(row.lastActiveDate, today) === 1) {
    newStreak = row.currentStreak + 1;
  } else {
    // A gap that was not restored: fresh start.
    newStreak = 1;
  }

  let shields = row.shieldCount;
  let earnedShield = false;
  if (newStreak % SHIELD_EVERY_DAYS === 0 && shields < MAX_SHIELDS) {
    shields += 1;
    earnedShield = true;
  }

  return {
    skipped: false as const,
    newStreak,
    newLongest: Math.max(newStreak, row.longestStreak),
    newShieldCount: shields,
    earnedShield,
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Wording for the loss screen.
export function getStreakLossCopy(lostStreak: number, missedDays: number, shieldCount: number) {
  const missedText = missedDays <= 1 ? 'yesterday' : `the last ${missedDays} days`;
  const canRestore = missedDays >= 1 && shieldCount >= missedDays;

  let restoreNote: string;
  if (canRestore) {
    restoreNote = `You have ${plural(shieldCount, 'shield')}. Using ${missedDays} brings it back.`;
  } else if (shieldCount === 0) {
    restoreNote = "You don't have a shield to bring it back.";
  } else {
    restoreNote = `Bringing it back takes ${plural(missedDays, 'shield')}, and you have ${shieldCount}.`;
  }

  return {
    title: `Your ${lostStreak}-day streak ended.`,
    body: `You missed ${missedText}. Every day you showed up still counts.`,
    canRestore,
    restoreNote,
    restoreLabel: `Use ${plural(Math.max(missedDays, 1), 'shield')} to restore it`,
  };
}