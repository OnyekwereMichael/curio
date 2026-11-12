import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { getDailyQuests, XP_UPDATED_EVENT, type DailyQuests } from '../services/xp';

/** Today's quests, read from `daily_quests`. Refreshes when XP changes (quiz done, word learned). */
export function DailyQuestsPanel() {
  const [data, setData] = useState<DailyQuests | null>(null);

  useEffect(() => {
    const load = () => getDailyQuests().then(setData).catch((e) => console.error('getDailyQuests failed', e));
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
            <span className="text-xs font-semibold text-gold-700 bg-gold-50 px-2 py-1 rounded-tag flex-shrink-0">
              +{q.xp} XP
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
