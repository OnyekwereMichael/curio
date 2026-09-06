import { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/superbase';

export interface Word {
  id: string;
  word: string;
  definition: string;
  example_sentence: string;
  pronunciation_audio_url: string;
  category: string;
  publish_date: string;
  created_at: string;
}

export interface Fact {
  id: string;
  image_url: string;
  hook_line: string;
  context_line: string;
  bullet_1: string;
  bullet_2: string;
  bullet_3: string;
  bullet_4: string;
  category: string;
  publish_date: string;
  created_at: string;
}

export function useTodaysWord() {
  const { user } = useAuth();
  const [data, setData] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchWord = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const { data: word, error: fetchError } = await supabase
          .from('words')
          .select('*')
          .eq('publish_date', today)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setData(word);

        if (word) {
          // Upsert progress row — first_seen_at only sets on first insert
          // (the unique constraint + ignoreDuplicates means repeat visits
          // just leave the existing row untouched).
          const { error: upsertError } = await supabase
            .from('user_word_progress')
            .upsert(
              { user_id: user.id, word_id: word.id },
              { onConflict: 'user_id,word_id', ignoreDuplicates: true }
            );

          if (upsertError) {
            console.error('Failed to upsert word progress:', upsertError.message);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchWord();
  }, [user]);

  return { data, loading, error };
}

export function useOldButGold() {
  const { user } = useAuth();
  const [data, setData] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchOldButGold = async () => {
      try {
        setLoading(true);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const { data: progress, error: fetchError } = await supabase
          .from('user_word_progress')
          .select('*, words(*)')
          .eq('user_id', user.id)
          .lte('first_seen_at', threeDaysAgo.toISOString())
          .order('times_shown', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (progress?.words) {
          setData(progress.words as Word);

          const { error: updateError } = await supabase
            .from('user_word_progress')
            .update({
              last_resurfaced_at: new Date().toISOString(),
              times_shown: (progress.times_shown ?? 0) + 1,
            })
            .eq('id', progress.id);

          if (updateError) {
            console.error('Failed to update resurfaced word:', updateError.message);
          }
        } else {
          // No word yet qualifies (e.g. brand-new user) — this is expected,
          // not an error. The Home Screen simply won't render this card.
          setData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchOldButGold();
  }, [user]);

  return { data, loading, error };
}

export function useTodaysFact() {
  const { user } = useAuth();
  const [data, setData] = useState<Fact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFact = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const { data: fact, error: fetchError } = await supabase
          .from('facts')
          .select('*')
          .eq('publish_date', today)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setData(fact);

        if (fact) {
          const { error: upsertError } = await supabase
            .from('user_fact_progress')
            .upsert(
              { user_id: user.id, fact_id: fact.id },
              { onConflict: 'user_id,fact_id', ignoreDuplicates: true }
            );

          if (upsertError) {
            console.error('Failed to upsert fact progress:', upsertError.message);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchFact();
  }, [user]);

  return { data, loading, error };
}