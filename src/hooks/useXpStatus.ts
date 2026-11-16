import { useCallback, useEffect, useRef, useState } from 'react';
import { getXpStatus, msUntilLagosMidnight, XP_UPDATED_EVENT, type XpStatus } from '../services/xp';

/**
 * The player's XP for today and the week, read from the server ledger. It refetches when XP changes, when the
 * app comes back online or into view, and at midnight in Lagos, so "XP today" never shows yesterday's number.
 * A failed fetch keeps the last known value instead of blanking the display.
 */
export function useXpStatus() {
  const [status, setStatus] = useState<XpStatus | null>(null);
  const alive = useRef(true);

  const load = useCallback(() => {
    getXpStatus()
      .then((s) => alive.current && setStatus(s))
      .catch(() => undefined);
  }, []);

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

  return status;
}
