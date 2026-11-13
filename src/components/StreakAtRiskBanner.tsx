import { Otter } from './Otter';

interface Props {
  currentStreak: number;
  quizDone: boolean;
  shieldCount: number;
  onStart: () => void;
}

/** Real — shown in the evening when today's quiz isn't done yet and there's a streak worth protecting. */
export function StreakAtRiskBanner({ currentStreak, quizDone, shieldCount, onStart }: Props) {
  const hour = new Date().getHours();
  const isEvening = hour >= 18;

  if (!isEvening || quizDone || currentStreak <= 0) return null;

  return (
    <div className="bg-surface rounded-sheet border border-line shadow-card p-5 flex flex-col gap-4 font-ui">
      <div className="flex items-start gap-3">
        <Otter mood="sleepy" size={44} className="flex-shrink-0" />
        <div className="flex-1 min-w-0 bg-paper rounded-control px-3 py-2 border border-line">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold text-ink-900">Curi</span>
            <span className="text-[11px] text-ink-500">8:00 PM</span>
          </div>
          <p className="text-xs text-ink-900 leading-snug">Still time for today. Two minutes, then we nap.</p>
        </div>
      </div>

      <div>
        <p className="font-display text-title font-bold text-ink-900">Your {currentStreak} days are waiting</p>
        <p className="text-sm text-ink-500 mt-1">Today's plan is open until midnight. About 4 minutes.</p>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 transition-all"
      >
        Start today's plan
      </button>

      {shieldCount > 0 && (
        <p className="text-xs text-ink-500 text-center">
          You have {shieldCount} shield{shieldCount !== 1 ? 's' : ''} if tonight gets busy
        </p>
      )}
    </div>
  );
}
