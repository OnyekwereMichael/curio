import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { OnboardingShell } from './OnboardingShell';
import { Button } from '../../components/ui/Button';
import { LEVEL_OPTIONS } from '../../lib/onboardingOptions';
import { getOnboardingDraft, updateOnboardingDraft } from '../../services/onboarding';
import { cn } from '../../lib/utils';

export function LevelPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => {
    const draft = getOnboardingDraft();
    return LEVEL_OPTIONS.find((o) => o.label === draft.level)?.id ?? 'intermediate';
  });

  function handleContinue() {
    const option = LEVEL_OPTIONS.find((o) => o.id === selected);
    if (option) updateOnboardingDraft({ level: option.label });
    navigate('/onboarding/words-per-day');
  }

  return (
    <OnboardingShell step={2} totalSteps={6} backTo="/onboarding/word-style" skipTo="/onboarding/plan">
      <h1 className="font-display text-display font-bold text-ink-900 leading-tight mb-2 mt-4">
        How comfortable are you with English words?
      </h1>
      <p className="text-sm text-ink-500 mb-5">Pick the word that feels about right.</p>

      <div className="flex flex-col gap-2.5 flex-1">
        {LEVEL_OPTIONS.map((opt) => {
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'text-left rounded-card border-2 p-4 flex items-center justify-between transition-colors',
                active ? 'border-ink-900 bg-surface' : 'border-line bg-surface hover:border-line-strong'
              )}
            >
              <div>
                <p className="font-semibold text-ink-900 text-sm">{opt.label}</p>
                <p className="text-xs text-ink-500 mt-0.5">{opt.body}</p>
              </div>
              <span className="font-display italic text-ink-500 text-sm flex-shrink-0 ml-3">{opt.example}</span>
            </button>
          );
        })}
      </div>

      <Button onClick={handleContinue} className="w-full mt-6">
        Continue
      </Button>
    </OnboardingShell>
  );
}
