import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const MAX_SHIELDS = 2;

// Both dates are 'YYYY-MM-DD' strings, parsed as UTC midnight, so the
// difference is always a clean whole number of days.
function daysBetween(earlier: string, later: string): number {
  return Math.round(
    (new Date(later).getTime() - new Date(earlier).getTime()) / 86400000
  );
}

export function useStreak() {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [shieldCount, setShieldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [justIncremented, setJustIncremented] = useState(false);
  const [shieldsJustUsed, setShieldsJustUsed] = useState(0);
  const [shieldJustEarned, setShieldJustEarned] = useState(false);

  // READ-ONLY: loads current numbers for display, never increments anything.
  const loadStreak = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('current_streak, longest_streak, shield_count')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setCurrentStreak(data.current_streak ?? 0);
      setLongestStreak(data.longest_streak ?? 0);
      setShieldCount(data.shield_count ?? 0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadStreak();

    // Other copies of this hook (e.g. the header) listen for this so they
    // refresh the moment a quiz commits a new streak value.
    window.addEventListener('streak-updated', loadStreak);
    return () => window.removeEventListener('streak-updated', loadStreak);
  }, [loadStreak]);

  // The actual increment. Only called from quiz completion.
  const commitStreak = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('current_streak, longest_streak, last_active_date, shield_count')
      .eq('id', user.id)
      .single();

    if (error || !data) return;

    const today = new Date().toISOString().split('T')[0];
    const currentStored = data.current_streak ?? 0;
    let shields = data.shield_count ?? 0;
    let shieldsUsed = 0;
    let newStreak: number;

    if (!data.last_active_date) {
      // First ever completed quiz
      newStreak = 1;
    } else {
      const diff = daysBetween(data.last_active_date, today);

      if (diff <= 0) {
        // Already committed today — never double-increment.
        setCurrentStreak(currentStored);
        setLongestStreak(data.longest_streak ?? 0);
        setShieldCount(shields);
        return;
      }

      if (diff === 1) {
        // Showed up the very next day
        newStreak = currentStored + 1;
      } else {
        // Missed (diff - 1) days. Each missed day needs one shield.
        const missedDays = diff - 1;

        if (missedDays <= shields) {
          shieldsUsed = missedDays;
          shields -= missedDays;
          newStreak = currentStored + 1;
        } else {
          // Not enough shields to cover the gap: streak resets.
          // Shields stay banked, since they didn't save anything.
          newStreak = 1;
        }
      }
    }

    // Award a shield on every 7-day milestone, capped at MAX_SHIELDS.
    let earnedShield = false;
    if (newStreak % 7 === 0 && shields < MAX_SHIELDS) {
      shields += 1;
      earnedShield = true;
    }

    const newLongest = Math.max(newStreak, data.longest_streak ?? 0);

    const update: Record<string, any> = {
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      shield_count: shields,
    };
    if (shieldsUsed > 0) {
      update.shield_used_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(update)
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to commit streak:', updateError.message);
      return;
    }

    setCurrentStreak(newStreak);
    setLongestStreak(newLongest);
    setShieldCount(shields);
    setJustIncremented(true);
    setShieldsJustUsed(shieldsUsed);
    setShieldJustEarned(earnedShield);

    // Tell every other copy of this hook (header, etc.) to reload.
    window.dispatchEvent(new Event('streak-updated'));
  }, [user]);

  return {
    currentStreak,
    longestStreak,
    shieldCount,
    loading,
    justIncremented,
    shieldsJustUsed,   // Step 5 uses this for the "a shield protected you" message
    shieldJustEarned,  // Step 7 uses this for milestone moments
    commitStreak,
  };
}