import { Bookmark, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import type { ItemType } from '../services/savedItems';

interface SaveItemButtonProps {
  itemType: ItemType;
  saved: boolean;
  /** A save/unsave is still on its way (slow or offline). The tap is kept; the button just shows progress. */
  loading?: boolean;
  /** Brief highlight right after saving. */
  flash?: boolean;
  onToggle: () => void;
  className?: string;
}

/** The line shown beside the button, so a word and a fact say the same thing the same way. */
export function saveHelperText(itemType: ItemType, saved: boolean) {
  return saved ? 'In your Review.' : `Saved ${itemType === 'fact' ? 'facts' : 'words'} appear in your Review.`;
}

/** Labelled save toggle used wherever a word or a fact can be saved to Review (Today's Word, Today's Fact, cards, lists). */
export function SaveItemButton({ itemType, saved, loading = false, flash = false, onToggle, className }: SaveItemButtonProps) {
  const label = saved ? 'Saved' : `Save ${itemType}`;
  const Icon = loading ? Loader2 : saved ? Check : Bookmark;

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onToggle}
      aria-pressed={saved}
      aria-busy={loading}
      aria-label={label}
      title={label}
      className={cn(
        'min-h-11 min-w-11 px-4 py-2 whitespace-nowrap',
        saved && 'bg-moss-50 border-moss-600/30 text-moss-600 hover:bg-moss-50',
        flash && 'border-gold-500 bg-gold-50 text-gold-700',
        className
      )}
    >
      <Icon size={16} aria-hidden="true" className={loading ? 'animate-spin' : undefined} />
      {label}
    </Button>
  );
}
