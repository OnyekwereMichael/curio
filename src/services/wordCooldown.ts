import { supabase } from '../lib/superbase';

/** Mirrors public._learn_cooldown_seconds() on the server; the server is the authority, this is only for copy. */
export const COOLDOWN_SECONDS = 180;
export const COOLDOWN_LABEL = '3 minutes';

/**
 * What the server said at one moment. `at` is performance.now() (monotonic), never Date.now(),
 * so changing the device's date or time can't shorten the countdown.
 */
export interface CooldownSnapshot {
  seconds: number;
  at: number;
}

export function snapshot(seconds: number, at: number = performance.now()): CooldownSnapshot {
  return { seconds, at };
}

export function remainingSeconds(snap: CooldownSnapshot | null, now: number = performance.now()): number {
  if (!snap) return 0;
  return Math.max(0, Math.ceil(snap.seconds - (now - snap.at) / 1000));
}

/** 161 -> "2:41" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Seconds left per word (server clock). Words with no active cooldown are absent from the map. */
export async function fetchWordCooldowns(wordIds?: string[]): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('get_word_cooldowns', { p_word_ids: wordIds ?? null });
  if (error) throw new Error(error.message);
  const out = new Map<string, number>();
  for (const row of (data ?? []) as { word_id: string; seconds_remaining: number }[]) {
    out.set(row.word_id, row.seconds_remaining);
  }
  return out;
}
