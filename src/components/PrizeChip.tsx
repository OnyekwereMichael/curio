import { cn } from '../lib/utils';
import { formatPrize } from '../lib/leaderboardConfig';

const TONE = {
  1: 'bg-gold-50 text-gold-700 border-gold-500/40',
  2: 'bg-ink-900/5 text-ink-600 border-line-strong',
  3: 'bg-ember-50 text-ember-600 border-ember-600/30',
} as const;

interface PrizeChipProps {
  place: 1 | 2 | 3;
  amount: number;
  size?: 'sm' | 'md';
  /** Faded when the prize isn't currently claimable (e.g. below the XP minimum). */
  muted?: boolean;
  className?: string;
}

/** Gold / silver / bronze prize amount pill. 1st gets a soft shimmer. */
export function PrizeChip({ place, amount, size = 'sm', muted, className }: PrizeChipProps) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center overflow-hidden rounded-full border font-ui font-bold tabular-nums whitespace-nowrap',
        size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        TONE[place],
        muted && 'opacity-50',
        className
      )}
    >
      {place === 1 && !muted && <span aria-hidden="true" className="absolute inset-0 animate-prize-shimmer" />}
      <span className="relative">{formatPrize(amount)}</span>
    </span>
  );
}
