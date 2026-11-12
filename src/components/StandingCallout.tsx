import { PartyPopper, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { describeStanding } from '../lib/leaderboardStanding';
import type { LeaderboardMe } from '../services/leaderboard';

/** Where the user stands for the prizes: a celebration in the top 3, otherwise the XP gap and the prize it unlocks. */
export function StandingCallout({ me, className }: { me: LeaderboardMe; className?: string }) {
  const { headline, detail, winning } = describeStanding(me);
  const Icon = winning ? PartyPopper : TrendingUp;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-card border px-4 py-3 font-ui',
        winning ? 'bg-gold-50 border-gold-500/40' : 'bg-surface border-line shadow-card',
        className
      )}
    >
      <Icon size={20} className={cn('flex-shrink-0 mt-0.5', winning ? 'text-gold-700' : 'text-ember-600')} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">{headline}</p>
        <p className="text-xs text-ink-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
