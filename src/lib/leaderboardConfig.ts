/**
 * Leaderboard copy that product may change — prizes live here, not in the UI.
 * TODO: placeholder prizes — confirm the real ones before launch.
 */
export interface LeaderboardPrize {
  place: 1 | 2 | 3;
  title: string;
  detail: string;
}

export const WEEKLY_PRIZES: LeaderboardPrize[] = [
  { place: 1, title: 'Prize TBC', detail: 'Top of the week' },
  { place: 2, title: 'Prize TBC', detail: 'Runner-up' },
  { place: 3, title: 'Prize TBC', detail: 'Third place' },
];

export const LEADERBOARD_COPY = {
  title: 'Leaderboard',
  subtitle: 'Earn XP every day. The top 3 each week win a prize.',
} as const;
