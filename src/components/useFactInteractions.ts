import { useSaveItem } from '../hooks/useSaveItem';

/** Save state for a fact card. Saving itself is the shared useSaveItem (the same code path words use). */
export function useFactCardInteractions(factId: string, onSavedChange?: (saved: boolean) => void) {
  const save = useSaveItem('fact', factId, { source: 'fact_focus', onChange: onSavedChange });
  return { isSaved: save.isSaved, saveFlash: save.saveFlash, toggleSave: save.toggle };
}
