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
