import { MOCK_DUEL_PROMPTS, PLAY_MODES, type PlayModeFixture, type WordDuelPrompt } from '../mocks/games';

export function getPlayModes(): PlayModeFixture[] {
  return PLAY_MODES;
}

function randomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

// TODO(backend): real rooms live in `game_rooms`/`game_players`, synced over
// Supabase Realtime. This simulates a single opponent locally — see
// docs/BACKEND_TODO.md #7.
export async function createDuelRoom(): Promise<{ code: string }> {
  await new Promise((r) => setTimeout(r, 200));
  return { code: randomCode() };
}

export function getDuelPrompts(): WordDuelPrompt[] {
  return MOCK_DUEL_PROMPTS;
}
