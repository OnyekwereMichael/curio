import { cn } from '../lib/utils';
import type { WeeklyProgress } from '../services/progress';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SIZE = 96;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function message({ goalDays, doneDays, todayIndex }: WeeklyProgress): string {
  if (doneDays >= goalDays) return 'Goal reached — anything more is a bonus.';
  const needed = goalDays - doneDays;
  const daysLeft = 7 - todayIndex; // including today
  if (needed > daysLeft) return 'This week got away from you — a fresh one starts Monday.';
  return `${needed} more day${needed !== 1 ? 's' : ''} to hit your goal.`;
}

/** Ring of completed days this week against the weekly goal chosen in onboarding. */
export function WeeklyRing({ progress }: { progress: WeeklyProgress }) {
  const { goalDays, doneDays, week, todayIndex } = progress;
  const fraction = Math.min(1, doneDays / goalDays);
  const met = doneDays >= goalDays;

  return (
    <div className="bg-surface rounded-card border border-line shadow-card p-5 font-ui flex items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-ink-900/10" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            className={cn('transition-all duration-500', met ? 'stroke-moss-600' : 'stroke-ember-600')}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-display font-bold text-ink-900 leading-none">{doneDays}</span>
          <span className="text-[10px] text-ink-500 mt-0.5">of {goalDays}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-heading font-bold text-ink-900">This week</p>
        <p className="text-xs text-ink-500 mt-0.5">{message(progress)}</p>
        <div className="flex gap-1.5 mt-3">
          {DAY_LETTERS.map((letter, i) => (
            <span
              key={i}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold',
                week[i] ? 'bg-ember-600 text-on-ember' : 'bg-ink-900/5 text-ink-500',
                i === todayIndex && 'ring-2 ring-ember-600/40'
              )}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
