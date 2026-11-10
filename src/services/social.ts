import { MOCK_FRIENDS_LEADERBOARD, MOCK_STREAK_BUDDY, type FriendFixture } from '../mocks/social';

export interface FriendsData {
  leaderboard: FriendFixture[];
  streakBuddy: { name: string; daysTogether: number };
}

// TODO(backend): replace with real friendships/streak_buddies reads.
// See docs/BACKEND_TODO.md #6.
export async function getFriendsData(): Promise<FriendsData> {
  await new Promise((r) => setTimeout(r, 120));
  return { leaderboard: MOCK_FRIENDS_LEADERBOARD, streakBuddy: MOCK_STREAK_BUDDY };
}
