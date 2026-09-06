import { useState, useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

export function useStreak() {
    const { user } = useAuth();
    const [currentStreak, setCurrentStreak] = useState(0);
    const [justIncremented, setJustIncremented] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function syncStreak() {
            const { data, error } = await supabase
                .from('users')
                .select('current_streak, longest_streak, last_active_date')
                .eq('id', user?.id)
                .single();

            if (error) {
                console.error('Failed to load streak:', error.message);
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            // Already recorded today — nothing to do, just reflect current value
            if (data.last_active_date === today) {
                setCurrentStreak(data.current_streak);
                setLoading(false);
                return;
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const newStreak = data.last_active_date === yesterdayStr
                ? data.current_streak + 1  // consecutive day — extend it
                : 1;                        // gap in days (or first-ever visit) — reset to 1

            const newLongest = Math.max(newStreak, data.longest_streak ?? 0);

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    current_streak: newStreak,
                    longest_streak: newLongest,
                    last_active_date: today,
                })
                .eq('id', user?.id);

            if (updateError) {
                console.error('Failed to update streak:', updateError.message);
            }

            setCurrentStreak(newStreak);
            if (newStreak > data.current_streak) setJustIncremented(true);
            setLoading(false);
        }

        syncStreak();
    }, [user]);

    return { currentStreak, justIncremented, loading };
}