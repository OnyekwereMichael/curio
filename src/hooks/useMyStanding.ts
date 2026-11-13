import { useEffect, useState } from 'react';
import { getLeaderboard, type LeaderboardMe } from '../services/leaderboard';

/** The signed-in user's weekly rank and gaps — a one-row leaderboard call, for places that don't show the full board. */
export function useMyStanding(enabled: boolean) {
  const [me, setMe] = useState<LeaderboardMe | null>(null);
  const [periodStart, setPeriodStart] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getLeaderboard('week', 0, 1)
      .then((page) => {
        if (cancelled) return;
        setMe(page.me);
        setPeriodStart(page.periodStart.getTime());
      })
      .catch((e) => console.warn('getLeaderboard (standing) failed', e));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { me, periodStart };
}
