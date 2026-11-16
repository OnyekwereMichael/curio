import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../lib/superbase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { declineSavePrompt, hasDeclinedSavePrompt, notifySavedItem, setItemSaved, subscribeSavedItem } from './savedItems';

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe('setItemSaved', () => {
  it('goes through the one server upsert, with the item type, for words and facts', async () => {
    await setItemSaved('u1', 'word', 'w1', true);
    await setItemSaved('u1', 'fact', 'f1', true);
    expect(rpc).toHaveBeenCalledWith('set_item_saved', { p_type: 'word', p_id: 'w1', p_saved: true });
    expect(rpc).toHaveBeenCalledWith('set_item_saved', { p_type: 'fact', p_id: 'f1', p_saved: true });
  });

  it('coalesces rapid taps into the latest wish instead of save/unsave/save', async () => {
    const results = await Promise.all([
      setItemSaved('u1', 'fact', 'f2', true),
      setItemSaved('u1', 'fact', 'f2', false),
      setItemSaved('u1', 'fact', 'f2', true),
    ]);
    expect(results).toEqual([true, true, true]);
    expect(rpc.mock.calls.length).toBeLessThanOrEqual(2);
    expect(rpc.mock.calls.at(-1)?.[1].p_saved).toBe(true);
  });

  it('ends on unsaved when the last tap was an unsave', async () => {
    await Promise.all([setItemSaved('u1', 'word', 'w3', true), setItemSaved('u1', 'word', 'w3', false)]);
    expect(rpc.mock.calls.at(-1)?.[1].p_saved).toBe(false);
  });

  it('rejects on a real database error so the UI can roll back, then works again', async () => {
    rpc.mockResolvedValue({ error: { message: 'permission denied' } });
    await expect(setItemSaved('u1', 'fact', 'f4', true)).rejects.toBeTruthy();
    rpc.mockResolvedValue({ error: null });
    await expect(setItemSaved('u1', 'fact', 'f4', true)).resolves.toBe(true);
  });

  it('retries a network failure instead of dropping the tap', async () => {
    rpc.mockResolvedValueOnce({ error: { message: 'TypeError: Failed to fetch' } }).mockResolvedValue({ error: null });
    await expect(setItemSaved('u1', 'word', 'w5', true)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});

describe('change notifications and the session prompt memory', () => {
  it('keeps every subscriber for an item in sync, and unsubscribes cleanly', () => {
    const a = vi.fn();
    const off = subscribeSavedItem('fact', 'fx', a);
    notifySavedItem('fact', 'fx', true);
    off();
    notifySavedItem('fact', 'fx', false);
    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(true);
  });

  it('a word and a fact that share an id never notify each other', () => {
    const word = vi.fn();
    const off = subscribeSavedItem('word', 'same', word);
    notifySavedItem('fact', 'same', true);
    off();
    expect(word).not.toHaveBeenCalled();
  });

  it('remembers "Just test" per item for the session', () => {
    expect(hasDeclinedSavePrompt('fact', 'fd')).toBe(false);
    declineSavePrompt('fact', 'fd');
    expect(hasDeclinedSavePrompt('fact', 'fd')).toBe(true);
    expect(hasDeclinedSavePrompt('word', 'fd')).toBe(false);
  });
});
