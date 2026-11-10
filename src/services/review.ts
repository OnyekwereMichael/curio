import { fetchSavedWordsWithStatus } from './collection';
import type { Word } from '../pages/home/hooks';

export interface ReviewQueueItem {
  word: Word;
}

// Real words, mocked queue selection — see docs/BACKEND_TODO.md #4
// (user_word_progress.mastery/interval_step/due_at). Until that exists,
// "ready to review" is just the most recently saved words, capped at 8.
export async function getReviewQueue(userId: string): Promise<ReviewQueueItem[]> {
  const saved = await fetchSavedWordsWithStatus(userId);
  await new Promise((r) => setTimeout(r, 100));
  return saved.slice(0, 8).map((r) => ({ word: r.word }));
}

export type RecallRating = 'not-yet' | 'sort-of' | 'knew-it';

export const RECALL_NEXT_LABEL: Record<RecallRating, string> = {
  'not-yet': 'tomorrow',
  'sort-of': 'in 3 days',
  'knew-it': 'in 8 days',
};
