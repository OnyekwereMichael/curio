import { supabase } from '../lib/superbase';
import type { Word } from '../pages/home/hooks';

export interface WordList {
  id: string;
  name: string;
  count: number;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/** The current user's lists with a word count each, newest first. */
export async function getWordLists(): Promise<WordList[]> {
  const { data, error } = await supabase
    .from('word_lists')
    .select('id, name, word_list_items(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as { id: string; name: string; word_list_items: { count: number }[] }[];
  return rows.map((r) => ({ id: r.id, name: r.name, count: r.word_list_items?.[0]?.count ?? 0 }));
}

export async function createWordList(name: string): Promise<WordList> {
  const userId = await currentUserId();
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from('word_lists')
    .insert({ user_id: userId, name: trimmed })
    .select('id, name')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('You already have a list with that name.');
    throw error;
  }
  return { id: data.id, name: data.name, count: 0 };
}

export async function deleteWordList(listId: string): Promise<void> {
  const { error } = await supabase.from('word_lists').delete().eq('id', listId);
  if (error) throw error;
}

export async function getListWords(listId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('word_list_items')
    .select('added_at, words(*)')
    .eq('list_id', listId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as { words: Word | null }[];
  return rows.map((r) => r.words).filter(Boolean) as Word[];
}

export async function addWordToList(listId: string, wordId: string): Promise<void> {
  const { error } = await supabase
    .from('word_list_items')
    .upsert({ list_id: listId, word_id: wordId }, { onConflict: 'list_id,word_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeWordFromList(listId: string, wordId: string): Promise<void> {
  const { error } = await supabase.from('word_list_items').delete().eq('list_id', listId).eq('word_id', wordId);
  if (error) throw error;
}
