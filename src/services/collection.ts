import { supabase } from '../lib/superbase';
import type { Word, Fact } from '../pages/home/hooks';

// New real query — useSavedWords()/useSavedFacts() (src/hooks/useSavedItems.ts)
// return just the Word/Fact rows, not the progress row's marked_known/saved
// flags the redesigned Collection screen's filter chips need. Additive,
// doesn't touch that existing hook.

export interface SavedWordRow {
  word: Word;
  markedKnown: boolean;
}

export async function fetchSavedWordsWithStatus(userId: string): Promise<SavedWordRow[]> {
  const { data, error } = await supabase
    .from('user_word_progress')
    .select('marked_known, words(*)')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('first_seen_at', { ascending: false });

  if (error) {
    console.error('fetchSavedWordsWithStatus failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as { marked_known: boolean; words: Word | null }[];
  return rows.filter((r) => r.words).map((r) => ({ word: r.words as Word, markedKnown: !!r.marked_known }));
}

export interface SavedFactRow {
  fact: Fact;
}

export async function fetchSavedFactsWithStatus(userId: string): Promise<SavedFactRow[]> {
  const { data, error } = await supabase
    .from('user_fact_progress')
    .select('facts(*)')
    .eq('user_id', userId)
    .eq('saved', true)
    .order('seen_at', { ascending: false });

  if (error) {
    console.error('fetchSavedFactsWithStatus failed:', error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as { facts: Fact | null }[];
  return rows.filter((r) => r.facts).map((r) => ({ fact: r.facts as Fact }));
}
