import { getReduceMotionPref } from '../services/localPrefs';

/** OS-level prefers-reduced-motion OR the user's explicit Settings toggle. */
export function usePrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return getReduceMotionPref() || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
