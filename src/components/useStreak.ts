import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

export function useStreak() {
    const { user } = useAuth();
    const [currentStreak, setCurrentStreak] = useState(0);
    const [longestStreak, setLongestStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const [justIncremented, setJustIncremented] = useState(false);

    // READ-ONLY on mount — just displays the current numbers, never increments.
    useEffect(() => {
        if (!user) return;

        async function loadStreak() {
            const { data, error } = await supabase
                .from('users')
                .select('current_streak, longest_streak')
                .eq('id', user!.id)
                .single();

            if (!error && data) {
                setCurrentStreak(data.current_streak ?? 0);
                setLongestStreak(data.longest_streak ?? 0);
            }
            setLoading(false);
        }

        loadStreak();
    }, [user]);

    // The actual increment logic — now only called explicitly, from quiz completion.
    const commitStreak = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('users')
            .select('current_streak, longest_streak, last_active_date, shield_count')
            .eq('id', user.id)
            .single();

        if (error || !data) return;

        const today = new Date().toISOString().split('T')[0];

        // Already committed today — don't double-increment (belt-and-suspenders,
        // since the "already completed" screen should prevent re-entry anyway).
        if (data.last_active_date === today) {
            setCurrentStreak(data.current_streak);
            setLongestStreak(data.longest_streak);
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak: number;
        let shieldCount = data.shield_count ?? 0;

        if (data.last_active_date === yesterdayStr) {
            newStreak = data.current_streak + 1;
        } else if (shieldCount > 0) {
            newStreak = data.current_streak + 1;
            shieldCount -= 1;
        } else {
            newStreak = 1;
        }

        if (newStreak % 7 === 0 && shieldCount < 2) {
            shieldCount += 1;
        }

        const newLongest = Math.max(newStreak, data.longest_streak ?? 0);

        await supabase
            .from('users')
            .update({
                current_streak: newStreak,
                longest_streak: newLongest,
                last_active_date: today,
                shield_count: shieldCount,
            })
            .eq('id', user.id);

        setCurrentStreak(newStreak);
        setLongestStreak(newLongest);
        setJustIncremented(true);
    }, [user]);

    return { currentStreak, longestStreak, justIncremented, loading, commitStreak };
}