import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Otter, type OtterMood } from './Otter';
import { Button } from './ui/Button';
import type { WeekResult } from '../services/prizes';
import { ORDINAL, formatDeadline, formatMoney, timeLeft } from '../lib/payout';

interface Props {
  result: WeekResult | null;
  onClose: () => void;
  /** Winner tapped "Claim your prize" for this winner id. */
  onClaim: (winnerId: string) => void;
}

const PLACE: Record<number, { medal: string; headline: string; blurb: string; mood: OtterMood; ring: string; chip: string }> = {
  1: {
    medal: '🥇',
    headline: 'You won the week!',
    blurb: 'Nobody earned more XP than you. That is a proper win.',
    mood: 'cheering',
    ring: 'border-gold-500/60',
    chip: 'bg-gold-50 text-gold-700',
  },
  2: {
    medal: '🥈',
    headline: 'Second place!',
    blurb: 'So close to the top. Your streak is paying off.',
    mood: 'excited',
    ring: 'border-line-strong',
    chip: 'bg-ink-900/5 text-ink-900',
  },
  3: {
    medal: '🥉',
    headline: 'You made the podium!',
    blurb: 'Top three out of everyone who played this week.',
    mood: 'proud',
    ring: 'border-ember-500/40',
    chip: 'bg-ember-50 text-ember-600',
  },
};

/** End-of-week result: a prize screen for 1st/2nd/3rd, an encouraging one for everyone else. */
export function WeeklyResultModal({ result, onClose, onClaim }: Props) {
  const navigate = useNavigate();
  const winner = result?.winner ?? null;
  const place = winner ? PLACE[winner.rank] : null;

  const claimable = winner?.status === 'pending' && !!timeLeft(winner.claimDeadline);
  const gap = result && result.thirdXp != null ? Math.max(result.thirdXp - result.xp, 0) : null;
  const belowMin = !!result && result.xp < result.minWeeklyXp;

  return createPortal(
    <AnimatePresence>
      {result && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-900/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="week-result-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className={`w-full max-w-sm bg-paper rounded-sheet border-2 ${place?.ring ?? 'border-line'} shadow-raised p-6 font-ui text-center flex flex-col items-center`}
          >
            {result?.removal ? (
              <>
                <Otter mood="supportive" size={84} className="mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider text-ember-600 mb-1">Last week's results</p>
                <h2 id="week-result-title" className="font-display text-title font-bold text-ink-900 mb-3">
                  Your result was removed
                </h2>
                <p className="text-sm text-ink-500 mb-3">
                  Your account has been disqualified from last week's prize, so it won't be paid.
                </p>
                {result.removal.reason && (
                  <div className="rounded-control bg-ember-50 px-4 py-3 mb-3 w-full text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ember-600 mb-1">Reason</p>
                    <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-line">{result.removal.reason}</p>
                  </div>
                )}
                <p className="text-sm text-ink-900/80 mb-5">
                  Please <strong>check your email</strong> for the full details and how to respond. Look in spam if you can't find it.
                </p>
                <Button className="w-full" onClick={onClose}>I understand</Button>
              </>
            ) : winner && place ? (
              <>
                <div className="text-5xl mb-1" aria-hidden="true">{place.medal}</div>
                <Otter mood={place.mood} size={84} className="mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider text-gold-700 mb-1">
                  {ORDINAL[winner.rank]} place · {result.xp} XP
                </p>
                <h2 id="week-result-title" className="font-display text-title font-bold text-ink-900 mb-1">{place.headline}</h2>
                <p className="text-sm text-ink-500 mb-4">{place.blurb}</p>

                <div className={`rounded-control px-5 py-3 mb-4 w-full ${place.chip}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Your prize</p>
                  <p className="font-display text-display font-bold leading-tight">{formatMoney(winner.prizeAmount, winner.currency)}</p>
                </div>

                {claimable && (
                  <>
                    <Button className="w-full" onClick={() => onClaim(winner.id)}>Claim your prize</Button>
                    <p className="text-xs text-ink-500 mt-2">
                      Submit your payout details by {formatDeadline(winner.claimDeadline)} ({timeLeft(winner.claimDeadline)}).
                    </p>
                    <button onClick={onClose} className="mt-3 text-sm font-medium text-ink-500 hover:text-ink-900">
                      I'll do it later
                    </button>
                  </>
                )}
                {winner.status === 'submitted' && (
                  <>
                    <p className="text-sm text-moss-600 mb-3">Details received. Your prize is being processed.</p>
                    <Button className="w-full" onClick={onClose}>Great</Button>
                  </>
                )}
                {winner.status === 'paid' && (
                  <>
                    <p className="text-sm text-moss-600 mb-3">Your prize has been paid.</p>
                    <Button className="w-full" onClick={onClose}>Great</Button>
                  </>
                )}
                {(winner.status === 'expired' || (winner.status === 'pending' && !claimable)) && (
                  <>
                    <p className="text-sm text-ink-500 mb-3">The window to claim this prize has closed.</p>
                    <Button className="w-full" onClick={onClose}>Close</Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Otter mood="supportive" size={84} className="mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-1">Last week's results</p>
                <h2 id="week-result-title" className="font-display text-title font-bold text-ink-900 mb-1">
                  You finished #{result?.rank}
                </h2>
                <p className="text-sm text-ink-500 mb-4">
                  {result?.xp} XP{result && result.participants > 1 ? ` · out of ${result.participants} learners` : ''}
                </p>

                <div className="rounded-control bg-ink-900/5 px-4 py-3 mb-5 w-full text-sm text-ink-900/80 leading-relaxed">
                  {belowMin ? (
                    <>Earn at least <strong>{result?.minWeeklyXp} XP</strong> in a week to be eligible for a prize. You can do it!</>
                  ) : gap != null && gap > 0 ? (
                    <>You were just <strong>{gap} XP</strong> away from the podium. One more daily quest could make the difference.</>
                  ) : (
                    <>You were right on the edge of the podium. A little more XP each day and you're in.</>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    onClose();
                    navigate('/leaderboard');
                  }}
                >
                  See the leaderboard
                </Button>
                <button onClick={onClose} className="mt-3 text-sm font-medium text-ink-500 hover:text-ink-900">
                  Keep learning
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
