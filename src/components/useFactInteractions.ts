import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

export function useFactCardInteractions(factId: string) {
    const { user } = useAuth();
    const [isSaved, setIsSaved] = useState(false);
    const [saveFlash, setSaveFlash] = useState(false);

    // Load whatever's already saved for this fact/user pair on mount or when
    // the fact changes — without this, a refresh would always show "unsaved."
    useEffect(() => {
        setSaveFlash(false);

        if (!user || !factId) {
            setIsSaved(false);
            return;
        }

        let cancelled = false;

        async function loadInitialState() {
            const { data, error } = await supabase
                .from('user_fact_progress')
                .select('saved')
                .eq('user_id', user?.id)
                .eq('fact_id', factId)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                console.error('Failed to load fact progress state:', error.message);
                return;
            }

            setIsSaved(data?.saved ?? false);
        }

        loadInitialState();

        return () => {
            cancelled = true;
        };
    }, [factId, user]);

    const toggleSave = useCallback(async () => {
        if (!user || !factId) return;

        setIsSaved((prev) => {
            const next = !prev;
            if (next) {
                setSaveFlash(true);
                setTimeout(() => setSaveFlash(false), 300);
            }
            return next;
        });

        const newSavedState = !isSaved;

        const { error } = await supabase
            .from('user_fact_progress')
            .update({ saved: newSavedState })
            .eq('user_id', user.id)
            .eq('fact_id', factId);

        if (error) {
            console.error('Failed to update saved state:', error.message);
            setIsSaved((prev) => !prev); // revert on failure
        }
    }, [factId, user, isSaved]);

    return { isSaved, saveFlash, toggleSave };
}