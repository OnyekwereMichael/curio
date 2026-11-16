import { Zap } from 'lucide-react';
import { useXpStatus } from '../hooks/useXpStatus';
import { cn } from '../lib/utils';

/** "XP today: 43 / 85". Past 85 XP pays at half rate, and nothing is paid past the second limit. */
export function XpTodayChip() {
  const xp = useXpStatus();
  if (!xp) return null;

  const maxed = xp.today >= xp.ceilingHalf;
  const halfRate = !maxed && xp.today >= xp.ceilingFull;
  const title = maxed
    ? "You've maxed out today. Come back tomorrow, your streak is safe."
    : halfRate
      ? 'Past the daily limit, XP now pays half.'
      : 'XP earned today. The count starts again at midnight (Lagos time).';

  return (
    <div
      title={title}
      aria-label={`XP today: ${xp.today} of ${xp.ceilingFull}. ${title}`}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold font-ui tabular-nums',
        maxed ? 'bg-moss-50 text-moss-600 border-moss-600/20' : halfRate ? 'bg-gold-50 text-gold-700 border-gold-500/30' : 'bg-ink-900/[0.04] text-ink-900 border-line'
      )}
    >
      <Zap size={13} aria-hidden="true" />
      <span className="max-sm:hidden">XP today:</span>
      <span>{Math.min(xp.today, xp.ceilingFull)} / {xp.ceilingFull}</span>
    </div>
  );
}
