import { supabase } from '../lib/superbase';

export interface DailyQuest {
  id: string;
  label: string;
  xp: number;
  completed: boolean;
}

export interface DailyQuests {
  quests: DailyQuest[];
  completedCount: number;
}

export interface XpSyncResult {
  total_xp: number;
  level: number;
  new_badges: string[];
}

// Fired after anything that can change XP (quiz finished, word marked known)
// so panels showing XP/quests can refetch.
export const XP_UPDATED_EVENT = 'curi:xp-updated';

const QUEST_LABELS: Record<string, string> = {
  learn_words: "Learn today's words",
  quiz_score: 'Get 4 of 5 on the quiz',
  review_3: 'Review 3 saved words',
};

function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Asks the server to recompute today's quests, XP and badges from what the
 * user has actually done. The server is the only writer of XP, so the
 * client can't award itself anything.
 */
export async function syncXp(): Promise<XpSyncResult | null> {
  const { data, error } = await supabase.rpc('sync_xp', { p_date: todayUtc() });
  if (error) {
    console.warn('sync_xp failed', error.message);
    return null;
  }
  return data as XpSyncResult;
}

/** Tell the rest of the app XP may have changed, after syncing. */
export async function syncXpAndNotify(): Promise<XpSyncResult | null> {
  const result = await syncXp();
  window.dispatchEvent(new CustomEvent(XP_UPDATED_EVENT, { detail: result }));
  return result;
}

export async function getDailyQuests(): Promise<DailyQuests> {
  await syncXp();
  const { data, error } = await supabase
    .from('daily_quests')
    .select('key, xp, completed_at')
    .eq('quest_date', todayUtc())
    .order('key');
  if (error) throw error;
  const quests = (data ?? []).map((q) => ({
    id: q.key as string,
    label: QUEST_LABELS[q.key as string] ?? (q.key as string),
    xp: q.xp as number,
    completed: !!q.completed_at,
  }));
  return { quests, completedCount: quests.filter((q) => q.completed).length };
}

/** Mirrors the server's quiz award (5 per correct + 10, +15 for a perfect score). */
export function estimateQuizXp(correctCount: number, total: number): number {
  const perfectBonus = total > 0 && correctCount === total ? 15 : 0;
  return correctCount * 5 + 10 + perfectBonus;
}

/** XP an XP-bearing streak milestone badge awards (see `badges` table). */
export const MILESTONE_XP = 100;
