import { useCallback, useEffect, useState } from 'react';
import { fetchWordCooldowns, formatCountdown, remainingSeconds, snapshot, type CooldownSnapshot } from '../services/wordCooldown';

/**
 * Live "try again in m:ss" for one word's failed check.
 * The state lives on the server: it is re-fetched on mount, when the tab becomes visible again and
 * when the window regains focus, so it survives navigation, refreshes, logouts and other devices.
 * Between fetches it counts down on the monotonic clock.
 */
export function useWordCooldown(wordId: string) {
  const [snap, setSnap] = useState<CooldownSnapshot | null>(null);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const seconds = (await fetchWordCooldowns([wordId])).get(wordId);
      setSnap(seconds ? snapshot(seconds) : null);
    } catch (e) {
      // If we can't reach the server the button stays enabled; the server still rejects an early start.
      console.error('word cooldown fetch failed', e);
    }
  }, [wordId]);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const remaining = remainingSeconds(snap);
  const locked = remaining > 0;

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [locked]);

  return {
    locked,
    remaining,
    label: formatCountdown(remaining),
    /** Called right after a failed check, with the server's retry_seconds. */
    startLocal: (seconds: number) => setSnap(seconds > 0 ? snapshot(seconds) : null),
    refresh,
  };
}
