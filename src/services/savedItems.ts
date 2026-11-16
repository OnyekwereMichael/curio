import { supabase } from '../lib/superbase';

/**
 * Saving a word or a fact to Review, one code path for both. The write is the server function set_item_saved
 * (an upsert on user + item, so a second row is impossible); the read is the saved_items view. Both run as the
 * signed-in user, so row-level security keeps everyone to their own rows. Saving never awards XP.
 */
export type ItemType = 'word' | 'fact';

/**
 * What "Test me" does for an item that isn't saved yet:
 *   'prompt'   – ask "Save this word/fact to your Review?" (Save & test / Just test)
 *   'autosave' – save it silently and start the test
 * Change this one value to switch the behaviour for words and facts together.
 */
export type UnsavedTestPolicy = 'prompt' | 'autosave';
export const UNSAVED_TEST_POLICY: UnsavedTestPolicy = 'autosave';

const key = (type: ItemType, id: string) => `${type}:${id}`;

// ── change notifications, so every mounted button for an item stays in sync ──
type Listener = (saved: boolean) => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribeSavedItem(type: ItemType, id: string, fn: Listener): () => void {
  const k = key(type, id);
  let set = listeners.get(k);
  if (!set) listeners.set(k, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(k);
  };
}

export function notifySavedItem(type: ItemType, id: string, saved: boolean) {
  listeners.get(key(type, id))?.forEach((fn) => fn(saved));
}

// ── "Just test" is remembered for the session so the prompt never nags about the same item ──
const declinedThisSession = new Set<string>();
export const declineSavePrompt = (type: ItemType, id: string) => declinedThisSession.add(key(type, id));
export const hasDeclinedSavePrompt = (type: ItemType, id: string) => declinedThisSession.has(key(type, id));

// ── reads ──
export async function fetchItemSaved(userId: string, type: ItemType, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_type', type)
    .eq('item_id', id)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// ── writes ──
function isNetworkError(e: { message?: string } | null) {
  return !!e && /failed to fetch|network|load failed|timeout/i.test(e.message ?? '');
}

function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener('online', done);
      resolve();
    };
    window.addEventListener('online', done);
  });
}

async function writeSaved(type: ItemType, id: string, saved: boolean) {
  const { error } = await supabase.rpc('set_item_saved', { p_type: type, p_id: id, p_saved: saved });
  return error;
}

async function writeWithRetry(type: ItemType, id: string, saved: boolean) {
  for (let attempt = 0; ; attempt++) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) await waitForOnline(); // keep the tap, send it later
    const error = await writeSaved(type, id, saved);
    if (!error) return;
    if (isNetworkError(error) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    throw error;
  }
}

const queue = new Map<string, { desired: boolean; promise: Promise<void> }>();

/**
 * Saves/unsaves an item. Calls for the same item are serialised and coalesced to the latest wish, so rapid
 * taps can't write save/unsave/save repeatedly. Offline taps wait for the connection instead of being lost.
 * Resolves with the saved state that actually reached the database.
 */
export function setItemSaved(userId: string, type: ItemType, id: string, saved: boolean): Promise<boolean> {
  const k = `${userId}:${key(type, id)}`;
  const existing = queue.get(k);
  if (existing) {
    existing.desired = saved;
    return existing.promise.then(() => existing.desired);
  }

  const entry = { desired: saved, promise: Promise.resolve() };
  queue.set(k, entry);
  entry.promise = (async () => {
    let written: boolean | undefined;
    try {
      while (written !== entry.desired) {
        const want = entry.desired;
        await writeWithRetry(type, id, want);
        written = want;
      }
    } finally {
      queue.delete(k);
    }
  })();
  return entry.promise.then(() => entry.desired);
}
