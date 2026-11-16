import { supabase } from '../lib/superbase';
import type { Fact } from '../pages/home/hooks';

export const FACTS_PER_DAY_OPTIONS = [1, 3, 5];

/** Today's facts as the server froze them for this Lagos day. The answers to quiz questions are never in here. */
export interface DailyFacts {
  date: string;
  /** What the player picked (1/3/5). */
  chosenCount: number;
  /** How many facts there really are today; smaller than chosenCount when the pool is nearly used up. */
  setSize: number;
  /** Some of today's facts were seen before because the pool ran out. */
  recycled: boolean;
  facts: Fact[];
  passedIds: string[];
  savedIds: string[];
}

export async function getDailyFacts(): Promise<DailyFacts> {
  const { data, error } = await supabase.rpc('get_daily_facts');
  if (error) throw new Error(error.message);
  const d = data as {
    date: string; chosen_count: number; set_size: number; recycled: boolean;
    facts: Fact[]; passed: string[]; saved: string[];
  };
  return {
    date: d.date,
    chosenCount: d.chosen_count,
    setSize: d.set_size,
    recycled: d.recycled,
    facts: d.facts ?? [],
    passedIds: d.passed ?? [],
    savedIds: d.saved ?? [],
  };
}

