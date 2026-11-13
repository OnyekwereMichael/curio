import { supabase } from '../lib/superbase';
import type { Word, Fact } from '../pages/home/hooks';

export interface DailyPlan {
  words: Word[];
  fact: Fact | null;
}

// Home, Word focus and Fact focus all need today's plan; share one request
// per user per day instead of each calling the database separately.
const cache = new Map<string, Promise<DailyPlan>>();

function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

/** Old behaviour: the one word/fact whose publish_date is today. */
async function legacyPlan(today: string): Promise<DailyPlan> {
  const [w, f] = await Promise.all([
    supabase.from('words').select('*').eq('publish_date', today),
    supabase.from('facts').select('*').eq('publish_date', today).maybeSingle(),
  ]);
  if (w.error) throw w.error;
  if (f.error) throw f.error;
  return { words: (w.data ?? []) as Word[], fact: (f.data ?? null) as Fact | null };
}

export function getDailyPlan(userId: string): Promise<DailyPlan> {
  const today = todayUtc();
  const key = `${userId}:${today}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const promise = (async () => {
    const { data, error } = await supabase.rpc('get_or_build_daily_plan', { p_date: today });
    if (error || !data) {
      // Never leave the home screen empty because the planner failed.
      console.warn('get_or_build_daily_plan failed, using publish_date fallback', error?.message);
      return legacyPlan(today);
    }
    const plan = data as { words?: Word[]; fact?: Fact | null };
    return { words: plan.words ?? [], fact: plan.fact ?? null };
  })();

  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

/** Call after the user's preferences change so the next read rebuilds. */
export function clearDailyPlanCache() {
  cache.clear();
}
