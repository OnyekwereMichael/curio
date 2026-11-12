import { supabase } from '../lib/superbase';

export interface FriendFixture {
  id: string;
  name: string;
  weeklyXp: number;
  isMe: boolean;
}

export interface StreakBuddy {
  id: string;
  name: string;
  daysTogether: number;
  bothDoneToday: boolean;
}

export interface FriendsData {
  leaderboard: FriendFixture[];
  streakBuddy: StreakBuddy | null;
  friendsCount: number;
  /** Whether the current user has opted out of friends' leaderboards. */
  hidden: boolean;
}

/**
 * Friends only ever expose a first name and this week's XP — the database
 * functions behind these calls never return emails or full names, and there
 * is no way to search for people. Friendships are made with invite codes.
 */
export async function getFriendsData(): Promise<FriendsData> {
  const { data, error } = await supabase.rpc('get_friends_data');
  if (error) throw error;
  const d = data as {
    leaderboard: { id: string; name: string; weekly_xp: number; is_me: boolean }[];
    friends_count: number;
    hidden: boolean;
    streak_buddy: { id: string; name: string; days_together: number; both_done_today: boolean } | null;
  };
  return {
    leaderboard: d.leaderboard.map((f) => ({ id: f.id, name: f.name, weeklyXp: f.weekly_xp, isMe: f.is_me })),
    friendsCount: d.friends_count,
    hidden: d.hidden,
    streakBuddy: d.streak_buddy
      ? {
          id: d.streak_buddy.id,
          name: d.streak_buddy.name,
          daysTogether: d.streak_buddy.days_together,
          bothDoneToday: d.streak_buddy.both_done_today,
        }
      : null,
  };
}

/** Number of accepted friends — used by Profile. */
export async function getFriendsCount(): Promise<number> {
  const { count, error } = await supabase.from('friendships').select('friend_id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

/** The user's current unused invite code (one is created if none exists). */
export async function getInviteCode(): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_invite');
  if (error) throw error;
  return data as string;
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/friends?code=${encodeURIComponent(code)}`;
}

/** Returns the new friend's first name. Throws a readable message on a bad/used/own code. */
export async function acceptInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invite', { p_code: code });
  if (error) throw new Error(error.message);
  return (data as { friend_name: string }).friend_name;
}

export async function removeFriend(friendId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId });
  if (error) throw error;
}

/** Pass null to stop having a streak buddy. */
export async function setStreakBuddy(friendId: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_streak_buddy', { p_friend_id: friendId });
  if (error) throw error;
}

export async function setHideFromBoard(hidden: boolean): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Not signed in');
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, hide_from_board: hidden }, { onConflict: 'user_id' });
  if (error) throw error;
}
