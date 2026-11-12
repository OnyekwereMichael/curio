// Real, client-side-only preferences — no backend table needed for these,
// so they're not mocks. Each is namespaced so it doesn't collide with
// anything else already using localStorage in this app.

const factOpenedKey = (factId: string) => `curi_fact_opened_${factId}`;

export function markFactOpened(factId: string) {
  try {
    localStorage.setItem(factOpenedKey(factId), '1');
  } catch {
    // localStorage unavailable (private mode, etc.) — not worth surfacing
  }
}

export function isFactOpened(factId: string): boolean {
  try {
    return localStorage.getItem(factOpenedKey(factId)) === '1';
  } catch {
    return false;
  }
}

const RECENT_SEARCHES_KEY = 'curi_recent_dictionary_searches';
const MAX_RECENT_SEARCHES = 5;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string) {
  try {
    const trimmed = term.trim();
    if (!trimmed) return;
    const existing = getRecentSearches().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

// Real, device-local preferences with no server-side need — Settings' Reduce
// motion and Sounds & haptics toggles.
const REDUCE_MOTION_KEY = 'curi_pref_reduce_motion';
const SOUNDS_HAPTICS_KEY = 'curi_pref_sounds_haptics';

export function getReduceMotionPref(): boolean {
  try {
    return localStorage.getItem(REDUCE_MOTION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setReduceMotionPref(enabled: boolean) {
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

export function getSoundsHapticsPref(): boolean {
  try {
    const v = localStorage.getItem(SOUNDS_HAPTICS_KEY);
    return v === null ? true : v === '1'; // on by default
  } catch {
    return true;
  }
}

export function setSoundsHapticsPref(enabled: boolean) {
  try {
    localStorage.setItem(SOUNDS_HAPTICS_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

const LAST_VISIT_KEY = 'curi_last_visit_at';
const LAST_RANK_KEY = 'curi_last_weekly_rank';

/** When the user last opened Home (ms epoch), or null on the first ever visit. */
export function getLastVisitAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function touchLastVisit() {
  try {
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/** Last weekly rank the user saw, tagged with the week it belongs to. */
export function getLastRank(): { week: number; rank: number } | null {
  try {
    const raw = localStorage.getItem(LAST_RANK_KEY);
    return raw ? (JSON.parse(raw) as { week: number; rank: number }) : null;
  } catch {
    return null;
  }
}

export function setLastRank(week: number, rank: number) {
  try {
    localStorage.setItem(LAST_RANK_KEY, JSON.stringify({ week, rank }));
  } catch {
    // ignore
  }
}
