/**
 * Weekly-prize competition config — the single place amounts, currency, start
 * date and eligibility live. Components read from here; nothing is hardcoded in UI.
 *
 * Keep in sync with the `leaderboard_config` table (the database uses it to
 * decide which XP counts); the service warns in the console if the start differs.
 */
export interface LeaderboardPrize {
  place: 1 | 2 | 3;
  amount: number;
}

export const COMPETITION = {
  /** Monday 16 Nov 2026, 00:00 Lagos (WAT, UTC+1, no DST). */
  startsAt: new Date('2026-11-16T00:00:00+01:00'),
  timezone: 'Africa/Lagos',
  locale: 'en-NG',
  currency: 'NGN',
  /** Weekly XP needed to be eligible for a prize. */
  minWeeklyXp: 50,
} as const;

export const WEEKLY_PRIZES: LeaderboardPrize[] = [
  { place: 1, amount: 2500 },
  { place: 2, amount: 1500 },
  { place: 3, amount: 1000 },
];

export const LEADERBOARD_COPY = {
  title: 'Leaderboard',
  subtitle: 'Earn XP every day. The top 3 each week win cash prizes.',
} as const;

const currencyFormat = new Intl.NumberFormat(COMPETITION.locale, {
  style: 'currency',
  currency: COMPETITION.currency,
  maximumFractionDigits: 0,
});

/** 2500 → "₦2,500" */
export function formatPrize(amount: number): string {
  return currencyFormat.format(amount);
}

export const TOP_PRIZE = Math.max(...WEEKLY_PRIZES.map((p) => p.amount));

export type CompetitionPhase = 'upcoming' | 'live';

export function getCompetitionPhase(now: number = Date.now()): CompetitionPhase {
  return now >= COMPETITION.startsAt.getTime() ? 'live' : 'upcoming';
}

/** Prize for a finishing position, or null when it's outside the top 3 or below the XP minimum. */
export function prizeFor(rank: number, weeklyXp: number): number | null {
  if (weeklyXp < COMPETITION.minWeeklyXp) return null;
  return WEEKLY_PRIZES.find((p) => p.place === rank)?.amount ?? null;
}

/** Prize amount for a place regardless of eligibility (for display of "what's up for grabs"). */
export function prizeForPlace(place: number): number | null {
  return WEEKLY_PRIZES.find((p) => p.place === place)?.amount ?? null;
}

/** The competition start in Lagos time, e.g. "Monday, Nov 16". */
export function formatStartDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: COMPETITION.timezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(COMPETITION.startsAt);
}

/** The one status line for both phases — used by the Home banner and the leaderboard. */
export function competitionStatusText(phase: CompetitionPhase): string {
  return phase === 'upcoming' ? `Starts ${formatStartDate()}` : 'Resets every Monday';
}
