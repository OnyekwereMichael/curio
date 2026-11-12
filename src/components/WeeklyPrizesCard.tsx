import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, X } from 'lucide-react';
import { Button } from './ui/Button';
import { PrizeChip } from './PrizeChip';
import { StandingCallout } from './StandingCallout';
import { useCompetitionPhase } from '../hooks/useCompetitionPhase';
import { useCountdown } from '../hooks/useCountdown';
import { useMyStanding } from '../hooks/useMyStanding';
import { COMPETITION, TOP_PRIZE, WEEKLY_PRIZES, formatPrize, weekKey } from '../lib/leaderboardConfig';
import { dismissPrizeCard, isPrizeCardDismissed } from '../services/localPrefs';

function formatRemaining({ days, hours, minutes }: { days: number; hours: number; minutes: number }): string {
  if (days > 0) return `${days}d ${hours}h`;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Home promo for the weekly leaderboard prizes. Pre-launch it says "Starts Monday";
 * once live it shows the week's countdown and the user's own standing.
 * Dismissible per competition week, so it comes back after each reset.
 */
export function WeeklyPrizesCard() {
  const navigate = useNavigate();
  const phase = useCompetitionPhase();
  const live = phase === 'live';
  const { me, periodEnd } = useMyStanding(live);
  const countdown = useCountdown(live ? periodEnd : COMPETITION.startsAt);
  const currentWeek = weekKey();
  const [dismissedWeek, setDismissedWeek] = useState<string | null>(() => (isPrizeCardDismissed(currentWeek) ? currentWeek : null));

  if (dismissedWeek === currentWeek) return null;

  function handleDismiss() {
    dismissPrizeCard(currentWeek);
    setDismissedWeek(currentWeek);
  }

  return (
    <section
      aria-label="Weekly leaderboard prizes"
      className="relative overflow-hidden bg-surface rounded-sheet border border-gold-500/40 shadow-card p-5 flex flex-col gap-4 font-ui"
    >
      <div aria-hidden="true" className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold-500/10 blur-2xl" />

      <button
        onClick={handleDismiss}
        aria-label="Dismiss weekly prizes"
        className="absolute top-3 right-3 p-1 rounded-full text-ink-500 hover:text-ink-900 hover:bg-ink-900/5 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="relative flex items-start gap-3 pr-6">
        <span className="w-11 h-11 rounded-full bg-gold-50 text-gold-700 flex items-center justify-center flex-shrink-0 animate-trophy-bounce">
          <Trophy size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-heading font-bold text-ink-900 leading-snug">Win up to {formatPrize(TOP_PRIZE)} every week</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            {live ? 'Top 3 on the weekly leaderboard take the prizes.' : 'Earn XP, climb the ranks, and get paid for learning.'}
          </p>
        </div>
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        {WEEKLY_PRIZES.map((p) => (
          <span key={p.place} className="inline-flex items-center gap-1.5">
            <span className="text-base" aria-hidden="true">{p.place === 1 ? '🥇' : p.place === 2 ? '🥈' : '🥉'}</span>
            <PrizeChip place={p.place} amount={p.amount} />
          </span>
        ))}
      </div>

      <p className="relative text-xs font-semibold text-gold-700">
        {!live ? 'Starts Monday' : countdown.done ? 'New week starting…' : `Ends in ${formatRemaining(countdown)}`}
      </p>

      {live && me && <StandingCallout me={me} className="relative" />}

      <Button onClick={() => navigate('/leaderboard')} className="relative w-full">
        View leaderboard
      </Button>
    </section>
  );
}
