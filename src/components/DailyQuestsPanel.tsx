import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { XpChip } from './XpChip';
import { getDailyQuests, xpLinesToday, XP_UPDATED_EVENT, type DailyQuests, type XpLine } from '../services/xp';

/** Today's quests, read from `daily_quests`. Refreshes when XP changes (quiz done, word learned). */
export function DailyQuestsPanel() {
  const [data, setData] = useState<DailyQuests | null>(null);
  const [lines, setLines] = useState<XpLine[]>([]);

  useEffect(() => {
    const load = () => {
      getDailyQuests().then(setData).catch((e) => console.error('getDailyQuests failed', e));
      // After getDailyQuests has synced, so quest and badge XP are already in the ledger. A failure keeps the last list.
      xpLinesToday().then(setLines).catch(() => undefined);
    };
    load();
    window.addEventListener(XP_UPDATED_EVENT, load);
    return () => window.removeEventListener(XP_UPDATED_EVENT, load);
  }, []);

  if (!data) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-heading font-bold text-ink-900">Daily quests</h2>
        <span className="text-xs text-ink-500 font-ui">
          {data.completedCount} of {data.quests.length}
        </span>
      </div>
      <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
        {data.quests.map((q) => (
          <div key={q.id} className="flex items-center gap-3 px-4 py-3.5 font-ui">
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                q.completed ? 'bg-moss-600 text-paper' : 'border-2 border-line-strong'
              )}
            >
              {q.completed && <Check size={12} strokeWidth={3} />}
            </span>
            <span className={cn('flex-1 text-sm font-medium', q.completed ? 'text-ink-900/50 line-through' : 'text-ink-900')}>
              {q.label}
            </span>
            <XpChip amount={q.xp} />
          </div>
        ))}
      </div>
      {lines.length > 0 && (
        <div className="bg-surface rounded-card border border-line shadow-card px-4 py-3 font-ui" aria-label="XP earned today">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-2">Earned today</p>
          <ul className="flex flex-col gap-1.5">
            {lines.map((l) => (
              <li key={l.label} className="flex items-center justify-between text-sm">
                <span className="text-ink-900">{l.label}</span>
                <span className="font-semibold text-gold-700">+{l.amount} XP</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm font-bold border-t border-line mt-2 pt-2">
            <span>Total</span>
            <span className="text-gold-700">+{lines.reduce((n, l) => n + l.amount, 0)} XP</span>
          </div>
        </div>
      )}
    </section>
  );
}
