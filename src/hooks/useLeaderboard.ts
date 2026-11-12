import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getLeaderboard,
  LEADERBOARD_PAGE_SIZE,
  type LeaderboardEntry,
  type LeaderboardMe,
  type LeaderboardPeriod,
} from '../services/leaderboard';

/** Loads the leaderboard for a period and pages in more rows on demand. */
export function useLeaderboard(period: LeaderboardPeriod) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardMe | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  // Guards against a slow response for an old period overwriting a newer one.
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    getLeaderboard(period, 0)
      .then((page) => {
        if (id !== requestId.current) return;
        setRows(page.rows);
        setMe(page.me);
        setPeriodEnd(page.periodEnd);
        setTotal(page.total);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        console.error('getLeaderboard failed', e);
        setError(true);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const hasMore = rows.length < total;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    getLeaderboard(period, rows.length, LEADERBOARD_PAGE_SIZE)
      .then((page) => {
        if (id !== requestId.current) return;
        setRows((prev) => [...prev, ...page.rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      })
      .catch((e) => console.error('getLeaderboard (more) failed', e))
      .finally(() => setLoadingMore(false));
  }, [period, rows.length, loading, loadingMore, hasMore]);

  return { rows, me, periodEnd, total, loading, loadingMore, error, hasMore, reload: load, loadMore };
}
