export interface WordDuelPrompt {
  question: string;
  options: string[];
  correctAnswer: string;
}

// Fixture only — see docs/BACKEND_TODO.md #7 (game_rooms/players/rounds +
// Realtime). There's no real opponent; "Tobi" is a simulated bot.
export const MOCK_OPPONENT_NAME = 'Tobi';

export const MOCK_DUEL_PROMPTS: WordDuelPrompt[] = [
  { question: 'Which word means "using very few words, almost rudely brief"?', options: ['Verbose', 'Laconic', 'Candid', 'Lucid'], correctAnswer: 'Laconic' },
  { question: 'Which word means "truthful and direct, even when it\'s awkward"?', options: ['Candid', 'Ambivalent', 'Eloquent', 'Pragmatic'], correctAnswer: 'Candid' },
  { question: 'Which word means "expressed clearly, easy to understand"?', options: ['Resilient', 'Lucid', 'Nuance', 'Austerity'], correctAnswer: 'Lucid' },
  { question: 'Which word means "lasting for a very short time"?', options: ['Perennial', 'Ephemeral', 'Eloquent', 'Verbose'], correctAnswer: 'Ephemeral' },
  { question: 'Which word means "finding something good without looking for it"?', options: ['Resilience', 'Serendipity', 'Austerity', 'Candor'], correctAnswer: 'Serendipity' },
];

export interface PlayModeFixture {
  id: string;
  name: string;
  description: string;
  playersLabel: string;
  action: 'play' | 'host';
  available: boolean;
}

export const PLAY_MODES: PlayModeFixture[] = [
  { id: 'word-duel', name: 'Word Duel', description: '1 vs 1 · pick the word for the definition · 2 min', playersLabel: '1 vs 1', action: 'play', available: true },
  { id: 'fact-or-fiction', name: 'Fact or Fiction', description: '2 to 8 players · vote true or false together', playersLabel: '2-8', action: 'host', available: false },
  { id: 'bluff', name: 'Bluff the Definition', description: '3 to 8 · write fake meanings, spot the real one', playersLabel: '3-8', action: 'host', available: false },
];
