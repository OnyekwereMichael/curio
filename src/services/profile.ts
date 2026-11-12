import { supabase } from '../lib/superbase';
import { syncXp } from './xp';
import { getFriendsCount } from './social';

export interface PebbleFixture {
  id: string;
  label: string;
  colorToken: 'ember' | 'ink' | 'moss' | 'gold';
}

export interface LevelFixture {
  level: number;
  title: string;
  xp: number;
  xpForNextLevel: number;
  nextTitle: string;
}

export interface ProfileExtras {
  level: LevelFixture;
  pebbleShelf: PebbleFixture[];
  pebbleShelfTotal: number;
  /** null when the user has no friends yet. */
  friendsCount: number | null;
}

const LEVEL_TITLES = [
  'Word Sprout',
  'Word Seeker',
  'Word Tinkerer',
  'Word Scout',
  'Lexicon Explorer',
  'Wordsmith',
  'Phrase Hunter',
  'Lexicon Keeper',
  'Word Sage',
  'Grand Lexicographer',
];

function titleFor(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

/** Cumulative XP needed to reach `level`. Matches the curve in sync_xp. */
function xpToReach(level: number): number {
  return 25 * level * (level - 1);
}

export async function getProfileExtras(): Promise<ProfileExtras> {
  // Make sure badges/XP are current before reading them.
  await syncXp();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Not signed in');

  const [friendsCount, userRes, earnedRes, badgeCountRes] = await Promise.all([
    getFriendsCount().catch(() => 0),
    supabase.from('users').select('total_xp, level').eq('id', userId).single(),
    supabase
      .from('user_badges')
      .select('earned_at, badges(key, name, color)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(4),
    supabase.from('badges').select('key', { count: 'exact', head: true }),
  ]);
  if (userRes.error) throw userRes.error;
  if (earnedRes.error) throw earnedRes.error;

  const totalXp = userRes.data.total_xp ?? 0;
  const level = userRes.data.level ?? 1;
  const base = xpToReach(level);
  const next = xpToReach(level + 1);

  const earned = (earnedRes.data ?? []) as unknown as {
    badges: { key: string; name: string; color: PebbleFixture['colorToken'] } | null;
  }[];

  return {
    level: {
      level,
      title: titleFor(level),
      // XP shown is progress within the current level, like the bar expects.
      xp: totalXp - base,
      xpForNextLevel: next - base,
      nextTitle: titleFor(level + 1),
    },
    pebbleShelf: earned
      .filter((e) => e.badges)
      .map((e) => ({ id: e.badges!.key, label: e.badges!.name, colorToken: e.badges!.color })),
    pebbleShelfTotal: badgeCountRes.count ?? 0,
    // Profile shows "best streak" in this slot until the user has friends.
    friendsCount: friendsCount > 0 ? friendsCount : null,
  };
}
