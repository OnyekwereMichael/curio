import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { OnboardingShell } from './OnboardingShell';
import { Button } from '../../components/ui/Button';
import { Otter } from '../../components/Otter';
import { WORDS_PER_DAY_OPTIONS } from '../../mocks/onboarding';
import { getOnboardingDraft, updateOnboardingDraft } from '../../services/onboarding';
import { cn } from '../../lib/utils';

const TIME_ESTIMATE: Record<number, string> = { 1: '2 min', 3: '4 min', 5: '6 min' };

export function WordsPerDayPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => getOnboardingDraft().wordsPerDay);

  function handleContinue() {
    updateOnboardingDraft({ wordsPerDay: selected });
    navigate('/onboarding/fact-topics');
  }

  return (
    <OnboardingShell step={3} totalSteps={6} backTo="/onboarding/level" skipTo="/onboarding/plan">
      <h1 className="font-display text-display font-bold text-ink-900 leading-tight mb-5 mt-4">
        How many words a day?
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {WORDS_PER_DAY_OPTIONS.map((n) => {
          const active = selected === n;
          return (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={cn(
                'rounded-card border-2 py-5 flex flex-col items-center gap-1 transition-colors',
                active ? 'border-ink-900 bg-ink-900 text-paper' : 'border-line bg-surface text-ink-900 hover:border-line-strong'
              )}
            >
              <span className="font-display text-3xl font-bold">{n}</span>
              <span className={cn('text-[11px]', active ? 'text-paper/70' : 'text-ink-500')}>
                word{n !== 1 ? 's' : ''}
              </span>
              <span className={cn('text-[10px]', active ? 'text-paper/50' : 'text-ink-500/70')}>
                about {TIME_ESTIMATE[n]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-surface rounded-card border border-line shadow-card p-4 flex items-center gap-3">
        <Otter mood="idle" size={44} />
        <p className="text-sm text-ink-500 flex-1">
          {selected} is my favourite number of pebbles.
        </p>
      </div>

      <div className="flex-1" />

      <Button onClick={handleContinue} className="w-full mt-6">
        Continue
      </Button>
    </OnboardingShell>
  );
}
