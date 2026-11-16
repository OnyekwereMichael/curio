import { Button } from './ui/Button';
import type { ItemType } from '../services/savedItems';

interface SaveToReviewPromptProps {
  itemType: ItemType;
  onSaveAndTest: () => void;
  onJustTest: () => void;
}

/** Inline, non-blocking nudge shown when someone taps "Test me" on a word or fact that isn't saved. */
export function SaveToReviewPrompt({ itemType, onSaveAndTest, onJustTest }: SaveToReviewPromptProps) {
  const title = `Save this ${itemType} to your Review?`;
  return (
    <div role="group" aria-label={title} className="rounded-control border border-ember-500/30 bg-ember-50 p-3 flex flex-col gap-3 font-ui">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="text-xs text-ink-500 -mt-2">Review only practises {itemType === 'fact' ? 'facts' : 'words'} you've saved.</p>
      <div className="flex gap-2">
        <Button onClick={onSaveAndTest} className="flex-1 min-h-11 py-2">
          Save &amp; test
        </Button>
        <Button variant="secondary" onClick={onJustTest} className="flex-1 min-h-11 py-2">
          Just test
        </Button>
      </div>
    </div>
  );
}
