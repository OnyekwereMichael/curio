import { supabase } from '../lib/superbase';
import type { Word, Fact } from '../pages/home/hooks';

// New real query — useSavedWords()/useSavedFacts() (src/hooks/useSavedItems.ts)
// return just the Word/Fact rows, not the progress row's marked_known/saved
// flags the redesigned Collection screen's filter chips need. Additive,
// doesn't touch that existing hook.

export interface SavedWordRow {
  word: Word;
  markedKnown: boolean;
  mastery: 'new' | 'learning' | 'mastered';
  /** null = never reviewed, so due now. */
  dueAt: string | null;
}

export async function fetchSavedWordsWithStatus(userId: string): Promise<SavedWordRow[]> {
  const { data, error } = await supabase
    .from('user_word_progress')
    .select('marked_known, mastery, due_at, words(*)')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('first_seen_at', { ascending: false });

  if (error) {
    console.error('fetchSavedWordsWithStatus failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    marked_known: boolean;
    mastery: SavedWordRow['mastery'];
    due_at: string | null;
    words: Word | null;
  }[];
  return rows
    .filter((r) => r.words)
    .map((r) => ({ word: r.words as Word, markedKnown: !!r.marked_known, mastery: r.mastery, dueAt: r.due_at }));
}

export interface SavedFactRow {
  fact: Fact;
  /** null = never reviewed, so due now. */
  dueAt: string | null;
}

export async function fetchSavedFactsWithStatus(userId: string): Promise<SavedFactRow[]> {
  const { data, error } = await supabase
    .from('user_fact_progress')
    .select('due_at, facts(id, image_url, hook_line, context_line, bullet_1, bullet_2, bullet_3, bullet_4, category, publish_date, created_at)')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('seen_at', { ascending: false });

  if (error) {
    console.error('fetchSavedFactsWithStatus failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as { due_at: string | null; facts: Fact | null }[];
  return rows.filter((r) => r.facts).map((r) => ({ fact: r.facts as Fact, dueAt: r.due_at }));
}
