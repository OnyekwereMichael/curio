import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

export type PlanRowState = 'done' | 'now' | 'next';

interface PlanRowProps {
  state: PlanRowState;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** One row of the home "plan" — a word, a fact, or the quiz — in its done/now/next state. */
export function PlanRow({ state, icon, title, subtitle, actionLabel, onAction }: PlanRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-control px-3 py-3 transition-colors font-ui',
        state === 'now' && 'bg-ember-50'
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          state === 'done' && 'bg-moss-50 text-moss-600',
          state === 'now' && 'bg-ember-600 text-on-ember',
          state === 'next' && 'border-2 border-dashed border-line-strong text-ink-500'
        )}
      >
        {state === 'done' ? <Check size={18} /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold font-ui', state === 'done' ? 'text-ink-900/60 line-through' : 'text-ink-900')}>
          {title}
        </p>
        <p className="text-xs text-ink-500 font-ui truncate">{subtitle}</p>
      </div>
      {state === 'now' && actionLabel && (
        <Button variant="primary" className="px-4 py-2 text-xs flex-shrink-0" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {state === 'done' && <span className="text-xs font-medium text-moss-600 flex-shrink-0">Done</span>}
      {state === 'next' && <span className="text-xs font-medium text-ink-500 flex-shrink-0">Next</span>}
    </div>
  );
}
