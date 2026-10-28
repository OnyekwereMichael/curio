import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { missedDaysSince, reconcile, recover, commit, type StreakRow } from '../lib/streakLogic';
import { supabase } from '../lib/superbase';

const COLUMNS = 'current_streak, longest_streak, last_active_date, shield_count, lost_streak';
const todayStr = () => new Date().toISOString().split('T')[0];

function toRow(d: any): StreakRow {
  return {
    currentStreak: d.current_streak ?? 0,
    longestStreak: d.longest_streak ?? 0,
    lastActiveDate: d.last_active_date ?? null,
    shieldCount: d.shield_count ?? 0,
    lostStreak: d.lost_streak ?? 0,
  };
}

const EMPTY: StreakRow = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  shieldCount: 0,
  lostStreak: 0,
};

export function useStreak() {
  const { user } = useAuth();
  const [row, setRow] = useState<StreakRow>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [justIncremented, setJustIncremented] = useState(false);
  const [shieldsJustUsed, setShieldsJustUsed] = useState(0);
  const [shieldJustEarned, setShieldJustEarned] = useState(false);

  const fetchRow = useCallback(async (): Promise<StreakRow | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('users')
      .select(COLUMNS)
      .eq('id', user.id)
      .single();
    if (error || !data) return null;
    return toRow(data);
  }, [user]);

  // READ-ONLY: loads the current numbers for display. Never changes anything.
  const loadStreak = useCallback(async () => {
    if (!user) return;
    const fresh = await fetchRow();
    if (fresh) setRow(fresh);
    setLoading(false);
  }, [user, fetchRow]);

  useEffect(() => {
    loadStreak();
    // Other copies of this hook (like the header) refresh when one changes the streak.
    window.addEventListener('streak-updated', loadStreak);
    return () => window.removeEventListener('streak-updated', loadStreak);
  }, [loadStreak]);

  // Call once when the Home screen opens. If a day was missed, the streak
  // resets to 0 right away and the old number is kept so a shield can restore it.
  const reconcileStreak = useCallback(async () => {
    if (!user) return;
    const current = await fetchRow();
    if (!current) return;

    const result = reconcile(current, todayStr());
    if (!result.changed) return;

    const { error } = await supabase
      .from('users')
      .update({ current_streak: result.currentStreak, lost_streak: result.lostStreak })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to reset streak:', error.message);
      return;
    }

    setRow({ ...current, currentStreak: result.currentStreak, lostStreak: result.lostStreak });
    window.dispatchEvent(new Event('streak-updated'));
  }, [user, fetchRow]);

  // The user chose to spend shields to bring their lost streak back.
  const recoverStreak = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const current = await fetchRow();
    if (!current) return false;

    const result = recover(current, todayStr());
    if (!result.ok) return false;

    const { error } = await supabase
      .from('users')
      .update({
        current_streak: result.newStreak,
        lost_streak: 0,
        shield_count: result.newShieldCount,
        shield_used_at: new Date().toISOString(),
        last_active_date: result.newLastActiveDate,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to restore streak:', error.message);
      return false;
    }

    setRow({
      ...current,
      currentStreak: result.newStreak,
      lostStreak: 0,
      shieldCount: result.newShieldCount,
      lastActiveDate: result.newLastActiveDate,
    });
    setShieldsJustUsed(result.shieldsUsed); // drives the "A shield protected your streak" notice
    window.dispatchEvent(new Event('streak-updated'));
    return true;
  }, [user, fetchRow]);

  // The user chose to let it go. Nothing to restore anymore.
  const dismissLostStreak = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from('users').update({ lost_streak: 0 }).eq('id', user.id);
    if (error) {
      console.error('Failed to clear lost streak:', error.message);
      return;
    }
    setRow((r) => ({ ...r, lostStreak: 0 }));
    window.dispatchEvent(new Event('streak-updated'));
  }, [user]);

  // Called only when a quiz is completed. This is the only thing that adds a day.
  const commitStreak = useCallback(async () => {
    if (!user) return;
    const current = await fetchRow();
    if (!current) return;

    const today = todayStr();
    const result = commit(current, today);
    if (result.skipped) return;

    const { error } = await supabase
      .from('users')
      .update({
        current_streak: result.newStreak,
        longest_streak: result.newLongest,
        last_active_date: today,
        shield_count: result.newShieldCount,
        lost_streak: 0,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to commit streak:', error.message);
      return;
    }

    setRow({
      currentStreak: result.newStreak,
      longestStreak: result.newLongest,
      lastActiveDate: today,
      shieldCount: result.newShieldCount,
      lostStreak: 0,
    });
    setJustIncremented(true);
    setShieldJustEarned(result.earnedShield);
    window.dispatchEvent(new Event('streak-updated'));
  }, [user, fetchRow]);

  return {
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    shieldCount: row.shieldCount,
    lostStreak: row.lostStreak,
    missedDays: missedDaysSince(row.lastActiveDate, todayStr()),
    loading,
    justIncremented,
    shieldsJustUsed,
    shieldJustEarned,
    reconcileStreak,
    recoverStreak,
    dismissLostStreak,
    commitStreak,
  };
}