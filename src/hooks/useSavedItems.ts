import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Word, Fact } from '../pages/home/hooks'; // adjust this path to wherever your Word/Fact types actually live
import { supabase } from '../lib/superbase';

export function useSavedWords() {
    const { user } = useAuth();
    const [data, setData] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function fetchSavedWords() {
            const { data: rows, error } = await supabase
                .from('user_word_progress')
                .select('*, words(*)')
                .eq('user_id', user?.id)
                .eq('saved', true)
                .order('first_seen_at', { ascending: false });

            if (error) {
                console.error('Failed to fetch saved words:', error.message);
                setLoading(false);
                return;
            }

            setData(rows.map((row) => row.words).filter(Boolean) as Word[]);
            setLoading(false);
        }

        fetchSavedWords();
    }, [user]);

    return { data, loading };
}

export function useSavedFacts() {
    const { user } = useAuth();
    const [data, setData] = useState<Fact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function fetchSavedFacts() {
            const { data: rows, error } = await supabase
                .from('user_fact_progress')
                .select('*, facts(*)')
                .eq('user_id', user?.id)
                .eq('saved', true)
                .order('seen_at', { ascending: false });

            if (error) {
                console.error('Failed to fetch saved facts:', error.message);
                setLoading(false);
                return;
            }

            setData(rows.map((row) => row.facts).filter(Boolean) as Fact[]);
            setLoading(false);
        }

        fetchSavedFacts();
    }, [user]);

    return { data, loading }
}