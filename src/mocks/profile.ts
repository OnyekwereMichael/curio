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

// Fixtures only — see docs/BACKEND_TODO.md #3 (XP/levels) and the
// badges/user_badges tables for what these become for real.
export const MOCK_LEVEL: LevelFixture = {
  level: 4,
  title: 'Word Scout',
  xp: 430,
  xpForNextLevel: 500,
  nextTitle: 'Lexicon Explorer',
};

export const MOCK_PEBBLE_SHELF: PebbleFixture[] = [
  { id: '7-day', label: '7-day', colorToken: 'ember' },
  { id: 'space-fan', label: 'Space fan', colorToken: 'ink' },
  { id: 'first-duel', label: 'First duel', colorToken: 'moss' },
  { id: 'perfect-week', label: 'Perfect week', colorToken: 'gold' },
];

export const MOCK_PEBBLE_SHELF_TOTAL = 24;
export const MOCK_FRIENDS_COUNT = 6;
