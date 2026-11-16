import { useCallback, useEffect, useState } from 'react';
import { getMyResults, markResultsSeen, type MyResults } from '../services/prizes';

const EMPTY: MyResults = { unseen: null, claims: [] };

/**
 * The signed-in user's finished-week result and prize claims. Everything lives on the server, so it
 * is re-read on mount and whenever the tab/app comes back to the foreground (a prize can land while
 * the app is closed). A closed results modal stays closed because the server remembers it.
 */
export function useMyPrizes() {
  const [data, setData] = useState<MyResults>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setData(await getMyResults());
    } catch (e) {
      console.error('getMyResults failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const dismissResult = useCallback(async (weekStart: string) => {
    setData((d) => ({ ...d, unseen: null }));
    await markResultsSeen(weekStart);
    refresh(); // an older unseen week (if any) can now surface
  }, [refresh]);

  /** Claims that still need the user to do something, or are waiting on payment. */
  const needsDetails = data.claims.filter((c) => c.status === 'pending');
  const awaitingPayment = data.claims.filter((c) => c.status === 'submitted');

  return { ...data, loading, refresh, dismissResult, needsDetails, awaitingPayment };
}
