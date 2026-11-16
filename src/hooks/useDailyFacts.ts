import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDailyFacts, type DailyFacts } from '../services/dailyFacts';
import { msUntilLagosMidnight, XP_UPDATED_EVENT } from '../services/xp';

/**
 * Today's facts from the server. Refetches when a quiz changes XP, when the app comes back online or into view,
 * and at midnight in Lagos, so a screen left open overnight moves on to the new day's set. A failed refetch keeps
 * the last good set instead of blanking it.
 */
export function useDailyFacts() {
  const { user } = useAuth();
  const [data, setData] = useState<DailyFacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const alive = useRef(true);

  const load = useCallback(() => {
    if (!user) return;
    getDailyFacts()
      .then((d) => {
        if (!alive.current) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive.current && setError(e instanceof Error ? e : new Error('Could not load facts')))
      .finally(() => alive.current && setLoading(false));
  }, [user]);

  useEffect(() => {
    alive.current = true;
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    window.addEventListener(XP_UPDATED_EVENT, load);
    window.addEventListener('online', load);
    document.addEventListener('visibilitychange', onVisible);

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        load();
        schedule();
      }, msUntilLagosMidnight());
    };
    schedule();

    return () => {
      alive.current = false;
      clearTimeout(timer);
      window.removeEventListener(XP_UPDATED_EVENT, load);
      window.removeEventListener('online', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
