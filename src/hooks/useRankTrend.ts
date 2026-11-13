import { useEffect, useState } from 'react';
import { MASCOT_TIMING } from '../lib/mascotConfig';
import { getLastRank, getLastVisitAt, setLastRank, touchLastVisit } from '../services/localPrefs';

/**
 * Two cheap signals for the mascot's mood, from localStorage: has the user been
 * away for a while, and did their weekly rank move since they last looked?
 */
export function useRankTrend(rank: number | null, week: number | null) {
  const [away] = useState(() => {
    const last = getLastVisitAt();
    return last != null && Date.now() - last > MASCOT_TIMING.awayAfterDays * 86400000;
  });
  const [trend, setTrend] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    touchLastVisit();
  }, []);

  useEffect(() => {
    if (rank == null || week == null) return;
    const prev = getLastRank();
    if (prev && prev.week === week && prev.rank !== rank) setTrend(rank < prev.rank ? 'up' : 'down');
    setLastRank(week, rank);
  }, [rank, week]);

  return { away, trend };
}
