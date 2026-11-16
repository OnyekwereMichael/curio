import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { track } from '../lib/analytics';
import { getSoundsHapticsPref } from '../services/localPrefs';
import {
  UNSAVED_TEST_POLICY,
  declineSavePrompt,
  fetchItemSaved,
  hasDeclinedSavePrompt,
  notifySavedItem,
  setItemSaved,
  subscribeSavedItem,
  type ItemType,
} from '../services/savedItems';

type Source = 'word_focus' | 'word_card' | 'fact_focus' | 'prompt' | 'result' | 'auto';

interface Options {
  /** Where the save was made, for analytics. */
  source: Source;
  /** Called whenever the visible saved state changes (including a rollback). */
  onChange?: (saved: boolean) => void;
}

/**
 * Everything about saving a word or a fact to Review, in one place: load/toggle with an optimistic update + rollback,
 * stay in sync with every other button for the same item, and the "Test me on an unsaved item" flow.
 * Switching that flow to auto-save is a one-line change to UNSAVED_TEST_POLICY in services/savedItems.
 */
export function useSaveItem(itemType: ItemType, itemId: string, { source, onChange }: Options) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false); // a write is still on its way (slow or offline)
  const [saveFlash, setSaveFlash] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const savedRef = useRef(false); // what the user currently sees
  const confirmedRef = useRef(false); // what the database last confirmed
  const callRef = useRef(0);
  const pendingStart = useRef<(() => void) | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const idProp = `${itemType}_id`;
  const noun = itemType === 'fact' ? 'facts' : 'words';

  const show = useCallback((saved: boolean) => {
    savedRef.current = saved;
    setIsSaved(saved);
    onChangeRef.current?.(saved);
  }, []);

  // Load this item's state, and follow changes made from any other screen. Also covers the item changing
  // under an open screen (e.g. at midnight): everything resets for the new one.
  useEffect(() => {
    callRef.current++;
    pendingStart.current = null;
    setPromptOpen(false);
    setLoading(false);
    setSaveFlash(false);
    savedRef.current = false;
    confirmedRef.current = false;
    setIsSaved(false);

    if (!user || !itemId) return;
    let cancelled = false;

    fetchItemSaved(user.id, itemType, itemId)
      .then((saved) => {
        if (cancelled) return;
        confirmedRef.current = saved;
        savedRef.current = saved;
        setIsSaved(saved);
      })
      .catch((e) => console.error('Failed to load saved state:', e?.message ?? e));

    const unsubscribe = subscribeSavedItem(itemType, itemId, (saved) => {
      savedRef.current = saved;
      setIsSaved(saved);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [itemType, itemId, user]);

  const apply = useCallback(
    (next: boolean, from: Source) => {
      if (!user || !itemId) return;
      show(next);
      notifySavedItem(itemType, itemId, next);
      if (next) {
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 300);
        if (getSoundsHapticsPref()) navigator.vibrate?.(10);
      }

      const call = ++callRef.current;
      setLoading(true);
      setItemSaved(user.id, itemType, itemId, next)
        .then((final) => {
          const changed = final !== confirmedRef.current;
          confirmedRef.current = final;
          if (changed) track(final ? `${itemType}_saved` : `${itemType}_unsaved`, { [idProp]: itemId, source: from });
          if (call === callRef.current) setLoading(false);
        })
        .catch((e) => {
          console.error('Failed to update saved state:', e?.message ?? e);
          if (call !== callRef.current) return; // a newer tap owns the state now
          show(confirmedRef.current);
          notifySavedItem(itemType, itemId, confirmedRef.current);
          setLoading(false);
          toast.error(`Couldn't update your saved ${noun}`, 'Check your connection and try again.');
        });
    },
    [user, itemType, itemId, idProp, noun, show, toast]
  );

  const toggle = useCallback(() => {
    if (!user) {
      toast.info(`Sign in to save ${noun}`, `Saved ${noun} appear in your Review.`);
      return;
    }
    apply(!savedRef.current, source);
  }, [user, apply, source, noun, toast]);

  // ── "Test me" ──
  const requestTest = useCallback(
    (start: () => void) => {
      if (savedRef.current || !user) return start();

      if (UNSAVED_TEST_POLICY === 'autosave') {
        track('test_started_unsaved', { [idProp]: itemId, item_type: itemType, prompt_shown: false, choice: 'autosave' });
        apply(true, 'auto');
        return start();
      }
      if (hasDeclinedSavePrompt(itemType, itemId)) {
        track('test_started_unsaved', { [idProp]: itemId, item_type: itemType, prompt_shown: false, choice: 'skipped_prompt' });
        return start();
      }
      pendingStart.current = start;
      setPromptOpen(true);
    },
    [user, itemType, itemId, idProp, apply]
  );

  const runPending = useCallback(() => {
    const start = pendingStart.current;
    pendingStart.current = null;
    setPromptOpen(false);
    start?.();
  }, []);

  const saveAndTest = useCallback(() => {
    track('save_and_test_tapped', { [idProp]: itemId, item_type: itemType });
    track('test_started_unsaved', { [idProp]: itemId, item_type: itemType, prompt_shown: true, choice: 'save_and_test' });
    apply(true, 'prompt'); // optimistic; never makes the test wait on the network
    runPending();
  }, [idProp, itemId, itemType, apply, runPending]);

  const justTest = useCallback(() => {
    declineSavePrompt(itemType, itemId); // don't ask again for this item this session
    track('just_test_tapped', { [idProp]: itemId, item_type: itemType });
    track('test_started_unsaved', { [idProp]: itemId, item_type: itemType, prompt_shown: true, choice: 'just_test' });
    runPending();
  }, [itemType, itemId, idProp, runPending]);

  return {
    isSaved,
    loading,
    saveFlash,
    toggle,
    /** Show the prompt only while the item is still unsaved. */
    promptOpen: promptOpen && !isSaved,
    requestTest,
    saveAndTest,
    justTest,
  };
}
