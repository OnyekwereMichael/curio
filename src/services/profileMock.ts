import { MOCK_LEVEL, MOCK_PEBBLE_SHELF, MOCK_PEBBLE_SHELF_TOTAL, MOCK_FRIENDS_COUNT, type LevelFixture, type PebbleFixture } from '../mocks/profile';

export interface ProfileExtras {
  level: LevelFixture;
  pebbleShelf: PebbleFixture[];
  pebbleShelfTotal: number;
  friendsCount: number;
}

// TODO(backend): replace with real reads once users.total_xp/level,
// badges/user_badges, and friendships exist. See docs/BACKEND_TODO.md.
export async function getProfileExtras(): Promise<ProfileExtras> {
  await new Promise((r) => setTimeout(r, 100));
  return {
    level: MOCK_LEVEL,
    pebbleShelf: MOCK_PEBBLE_SHELF,
    pebbleShelfTotal: MOCK_PEBBLE_SHELF_TOTAL,
    friendsCount: MOCK_FRIENDS_COUNT,
  };
}
