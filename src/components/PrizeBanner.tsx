import { Gift } from 'lucide-react';
import { PrizeChip } from './PrizeChip';
import { WeekCountdown } from './WeekCountdown';
import { COMPETITION, TOP_PRIZE, formatPrize, type CompetitionPhase, type LeaderboardPrize } from '../lib/leaderboardConfig';

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' } as const;
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' } as const;

interface PrizeBannerProps {
  prizes: LeaderboardPrize[];
  phase: CompetitionPhase;
  /** Start of the competition while upcoming, end of the week once live. */
  countdownTo: Date | null;
}

/** "Weekly prizes" card — all three prizes at a glance plus the start / reset countdown. */
export function PrizeBanner({ prizes, phase, countdownTo }: PrizeBannerProps) {
  const upcoming = phase === 'upcoming';
  return (
    <div className="bg-surface rounded-card border border-gold-500/30 shadow-card p-4 font-ui flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 uppercase tracking-wider">
          <Gift size={13} className="text-gold-500" />
          Weekly prizes
        </p>
        <span className="text-[11px] font-semibold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full">{upcoming ? 'Starting soon' : 'Live'}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {prizes.map((p) => (
          <div key={p.place} className="rounded-control bg-paper border border-line px-2 py-3 flex flex-col items-center gap-1.5 text-center">
            <span className="text-xl leading-none" aria-hidden="true">{MEDAL[p.place]}</span>
            <span className="text-[11px] font-semibold text-ink-500">{ORDINAL[p.place]}</span>
            <PrizeChip place={p.place} amount={p.amount} size="md" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <WeekCountdown endsAt={countdownTo} label={upcoming ? 'Prizes start in' : 'Ends in'} />
        <p className="text-xs text-ink-500">
          {upcoming
            ? 'Prizes start Monday, 12:00 AM Lagos time. Only XP earned from then counts toward the prizes.'
            : `Top 3 win every week. Earn at least ${COMPETITION.minWeeklyXp} XP to qualify, then climb for up to ${formatPrize(TOP_PRIZE)}.`}
        </p>
      </div>
    </div>
  );
}
