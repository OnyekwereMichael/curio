import { Gift } from 'lucide-react';
import { cn } from '../lib/utils';
import type { LeaderboardPrize } from '../lib/leaderboardConfig';

const ACCENT = { 1: 'text-gold-700 bg-gold-50', 2: 'text-ink-600 bg-ink-900/5', 3: 'text-ember-600 bg-ember-50' } as const;
const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' } as const;

/** "Weekly prizes" strip — one cell per podium place. Content comes from config. */
export function PrizeBanner({ prizes }: { prizes: LeaderboardPrize[] }) {
  return (
    <div className="bg-surface rounded-card border border-line shadow-card p-4 font-ui">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">
        <Gift size={13} className="text-gold-500" />
        Weekly prizes
      </p>
      <div className="grid grid-cols-3 gap-2">
        {prizes.map((p) => (
          <div key={p.place} className={cn('rounded-control px-2 py-2.5 text-center', ACCENT[p.place])}>
            <p className="text-xs font-bold">{ORDINAL[p.place]}</p>
            <p className="text-sm font-semibold text-ink-900 mt-0.5 leading-tight">{p.title}</p>
            <p className="text-[11px] text-ink-500 mt-0.5 leading-tight">{p.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
