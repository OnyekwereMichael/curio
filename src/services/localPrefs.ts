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
