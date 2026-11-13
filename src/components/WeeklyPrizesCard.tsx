import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { MascotCompanion } from './MascotCompanion';
import { Button } from './ui/Button';
import { PrizeChip } from './PrizeChip';
import { StandingCallout } from './StandingCallout';
import { useCompetitionPhase } from '../hooks/useCompetitionPhase';
import { useMyStanding } from '../hooks/useMyStanding';
import { useRankTrend } from '../hooks/useRankTrend';
import { TOP_PRIZE, WEEKLY_PRIZES, competitionStatusText, formatPrize } from '../lib/leaderboardConfig';

/**
 * Home promo for the weekly leaderboard prizes — always visible. The status line and
 * the personal standing follow the shared competition phase (upcoming → live).
 */
export function WeeklyPrizesCard({ streak = 0 }: { streak?: number }) {
  const navigate = useNavigate();
  const phase = useCompetitionPhase();
  const live = phase === 'live';
  const { me, periodStart } = useMyStanding(live);
  const { away, trend } = useRankTrend(me?.rank ?? null, periodStart);

  return (
    <section
      aria-label="Weekly leaderboard prizes"
      className="relative overflow-hidden bg-surface rounded-sheet border border-gold-500/40 shadow-card p-5 flex flex-col gap-4 font-ui"
    >
      <div aria-hidden="true" className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold-500/10 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <span className="relative overflow-hidden w-11 h-11 rounded-full bg-gold-50 text-gold-700 flex items-center justify-center flex-shrink-0 animate-trophy-bounce">
          <span aria-hidden="true" className="absolute inset-0 animate-prize-shimmer" />
          <Trophy size={22} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-heading font-bold text-ink-900 leading-snug">Win up to {formatPrize(TOP_PRIZE)} every week</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            {live ? 'Top 3 on the weekly leaderboard take the prizes.' : 'Earn XP, climb the ranks, and get paid for learning.'}
          </p>
        </div>
        <MascotCompanion
          size={62}
          context={{
            phase,
            rank: me?.rank,
            xpToPodium: me?.xpToPodium,
            streak: streak > 0 ? streak : undefined,
            topPrize: formatPrize(TOP_PRIZE),
            trend,
            away,
          }}
        />
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        {WEEKLY_PRIZES.map((p) => (
          <span key={p.place} className="inline-flex items-center gap-1.5">
            <span className="text-base" aria-hidden="true">{p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : '🥉'}</span>
            <PrizeChip place={p.place} amount={p.amount} />
          </span>
        ))}
      </div>

      <p className="relative text-xs font-semibold text-gold-700">{competitionStatusText(phase)}</p>

      {live && me && <StandingCallout me={me} className="relative" />}

      <Button onClick={() => navigate('/leaderboard')} className="relative w-full">
        View leaderboard
      </Button>
    </section>
  );
}
