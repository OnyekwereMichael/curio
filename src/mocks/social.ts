export interface FriendFixture {
  id: string;
  name: string;
  weeklyXp: number;
}

// Fixture only — see docs/BACKEND_TODO.md #6 (friendships/invites/streak_buddies).
export const MOCK_FRIENDS_LEADERBOARD: FriendFixture[] = [
  { id: 'tobi', name: 'Tobi', weeklyXp: 540 },
  { id: 'me', name: 'You', weeklyXp: 430 },
  { id: 'ada', name: 'Ada', weeklyXp: 310 },
  { id: 'kemi', name: 'Kemi', weeklyXp: 120 },
];

export const MOCK_STREAK_BUDDY = { name: 'Tobi', daysTogether: 9 };
