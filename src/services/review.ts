import { supabase } from '../lib/superbase';
import type { Word } from '../pages/home/hooks';

export type Mastery = 'new' | 'learning' | 'mastered';
export type RecallRating = 'not-yet' | 'sort-of' | 'knew-it';

export interface ReviewQueueItem {
  word: Word;
  mastery: Mastery;
  intervalStep: number;
}

/** Days until a word is next due, indexed by interval_step. Mirrors rate_review in the database. */
export const INTERVAL_DAYS = [1, 3, 8, 21, 45, 90];
const SESSION_SIZE = 8;

/** Saved words that are due: never reviewed yet, or due_at has passed. Oldest-due first. */
export async function getReviewQueue(userId: string): Promise<ReviewQueueItem[]> {
  const { data, error } = await supabase
    .from('user_word_progress')
    .select('mastery, interval_step, due_at, words(*)')
    .eq('user_id', userId)
    .eq('saved', true)
    .or(`due_at.is.null,due_at.lte.${new Date().toISOString()}`)
    .order('due_at', { ascending: true, nullsFirst: true })
    .order('first_seen_at', { ascending: true })
    .limit(SESSION_SIZE);
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    mastery: Mastery;
    interval_step: number;
    words: Word | null;
  }[];
  return rows
    .filter((r) => r.words)
    .map((r) => ({ word: r.words as Word, mastery: r.mastery, intervalStep: r.interval_step }));
}

/** Writes the rating; the database computes the next step, mastery and due date. */
export async function rateReview(wordId: string, rating: RecallRating): Promise<void> {
  const { error } = await supabase.rpc('rate_review', { p_word_id: wordId, p_rating: rating });
  if (error) throw error;
}

/** What the next interval would be for a rating — used for the button hints. */
export function nextIntervalLabel(step: number, rating: RecallRating): string {
  const next = rating === 'not-yet' ? 0 : rating === 'sort-of' ? Math.max(step, 1) : Math.min(step + 2, 5);
  const days = INTERVAL_DAYS[next];
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
};
