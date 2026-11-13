import { supabase } from '../lib/superbase';
import { COMPETITION } from '../lib/leaderboardConfig';

export type LeaderboardPeriod = 'week' | 'all';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  /** "First L." — never an email or full name. */
  name: string;
  avatarUrl: string | null;
  xp: number;
  isMe: boolean;
}

export interface LeaderboardMe extends LeaderboardEntry {
  /** XP needed to overtake the person directly above; null when already 1st. */
  xpToNext: number | null;
  /** XP needed to enter the top 3; null when already in it. */
  xpToPodium: number | null;
}

export interface LeaderboardPage {
  periodStart: Date;
  /** Competition start as the database sees it. */
  competitionStart: Date;
  periodEnd: Date;
  total: number;
  rows: LeaderboardEntry[];
  me: LeaderboardMe | null;
}

export const LEADERBOARD_PAGE_SIZE = 25;

interface RawEntry {
  rank: number;
  id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  is_me: boolean;
}

const toEntry = (r: RawEntry): LeaderboardEntry => ({
  rank: r.rank,
  id: r.id,
  name: r.name,
  avatarUrl: r.avatar_url,
  xp: r.xp,
  isMe: r.is_me,
});

/**
 * Ranked page of every (non-hidden) user. Ranking, pagination and the
 * public-safe field filtering all happen in the `get_leaderboard` database
 * function — the client never sees emails or other users' private data.
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  offset = 0,
  limit = LEADERBOARD_PAGE_SIZE,
): Promise<LeaderboardPage> {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: limit, p_offset: offset });
  if (error) throw error;
  const d = data as {
    period_start: string;
    period_end: string;
    competition_start: string;
    total: number;
    rows: RawEntry[];
    me: (RawEntry & { xp_to_next: number | null; xp_to_podium: number | null }) | null;
  };
  const competitionStart = new Date(d.competition_start);
  if (competitionStart.getTime() !== COMPETITION.startsAt.getTime()) {
    console.warn('leaderboardConfig.COMPETITION.startsAt differs from the leaderboard_config table — keep them in sync');
  }
  return {
    periodStart: new Date(d.period_start),
    competitionStart,
    periodEnd: new Date(d.period_end),
    total: d.total,
    rows: d.rows.map(toEntry),
    me: d.me ? { ...toEntry(d.me), xpToNext: d.me.xp_to_next, xpToPodium: d.me.xp_to_podium } : null,
  };
}
