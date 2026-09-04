import { useState, useEffect } from 'react';

// TODO (WIP): When Supabase is eventually connected, all real queries should respect Row-Level Security.

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
  const [data, setData] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO (WIP): replace with real Supabase query — select from words where publish_date = today
    // TODO (WIP): upsert user_word_progress row on first view (first_seen_at = now())
    const fetchWord = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Toggle this to test "no content today" state
        const hasContentToday = true;

        if (!hasContentToday) {
          setData(null);
        } else {
          setData({
            id: '1',
            word: 'Petrichor',
            definition: 'A pleasant smell that frequently accompanies the first rain after a long period of warm, dry weather.',
            example_sentence: 'Other than the petrichor emanating from the rapidly drying grass, there was not a trace of evidence that it had rained at all.',
            pronunciation_audio_url: '',
            category: 'nature',
            publish_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchWord();
  }, []);

  return { data, loading, error };
}

export function useOldButGold() {
  const [data, setData] = useState<Word | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO (WIP): replace with real query — select from user_word_progress where first_seen_at <= now() - 3 days, order by times_shown asc, limit 1, joined against words
    // TODO (WIP): replace this manual toggle with real logic once first_seen_at data exists
    const fetchOldButGold = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Toggle this flag to test both "has a resurfaced word" and "new user, nothing to resurface yet" states
        const hasOldButGold = true; 

        if (hasOldButGold) {
          setData({
            id: '2',
            word: 'Ephemeral',
            definition: 'Lasting for a very short time.',
            example_sentence: 'Fashions are ephemeral.',
            pronunciation_audio_url: '',
            category: 'general',
            publish_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
            created_at: new Date().toISOString(),
          });
        } else {
          setData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchOldButGold();
  }, []);

  return { data, loading, error };
}

export function useTodaysFact() {
  const [data, setData] = useState<Fact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO (WIP): replace with real Supabase query — select from facts where publish_date = today
    // TODO (WIP): upsert user_fact_progress row on first view (seen_at = now())
    const fetchFact = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Toggle this to test "no content today" state
        const hasContentToday = true;

        if (!hasContentToday) {
          setData(null);
        } else {
          setData({
            id: '1',
            image_url: 'https://images.unsplash.com/photo-1549480017-d76466a4b7e8?auto=format&fit=crop&w=600&q=80',
            hook_line: 'Octopuses have three hearts and blue blood.',
            context_line: 'These fascinating cephalopods have evolved a highly unique cardiovascular system to survive in the deep ocean.',
            bullet_1: 'Two branchial hearts pump blood through the gills, while one systemic heart pumps it through the rest of the body.',
            bullet_2: 'Their blood is blue because it contains a copper-rich protein called hemocyanin, which is more efficient than hemoglobin in cold, low-oxygen conditions.',
            bullet_3: 'When an octopus swims, the systemic heart stops beating, which explains why they prefer to crawl—swimming exhausts them.',
            bullet_4: 'If they lose a limb, it can completely regenerate, including the complex neural networks inside.',
            category: 'nature',
            publish_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchFact();
  }, []);

  return { data, loading, error };
}
