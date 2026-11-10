import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { AppShell } from '../../../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

/** Mock — see docs/BACKEND_TODO.md #1. Preview-only. */
export function PlanWhenPage() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<'tomorrow' | 'now'>('tomorrow');

  function handleConfirm() {
    navigate('/settings');
  }

  return (
    <AppShell title="When should it start?">
      <div className="px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <h1 className="font-display text-display font-bold text-ink-900 leading-tight">
          When should your plan start?
        </h1>

        <div className="flex flex-col gap-3 font-ui">
          {([
            { key: 'tomorrow' as const, title: 'Tomorrow', body: 'Today stays as it is. Recommended.' },
            { key: 'now' as const, title: 'Right now', body: 'Updates today to match your new plan. What you\'ve done is kept.' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setChoice(opt.key)}
              className={cn(
                'text-left rounded-card border-2 p-4 transition-colors',
                choice === opt.key ? 'border-ink-900 bg-surface' : 'border-line bg-surface hover:border-line-strong'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink-900">{opt.title}</p>
                {choice === opt.key && (
                  <span className="w-5 h-5 rounded-full bg-ink-900 text-paper flex items-center justify-center flex-shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-500 mt-1">{opt.body}</p>
            </button>
          ))}
        </div>

        <Button onClick={handleConfirm} className="w-full">
          Confirm
        </Button>
      </div>
    </AppShell>
  );
}
