import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { OnboardingShell } from './OnboardingShell';
import { Button } from '../../components/ui/Button';
import { Otter } from '../../components/Otter';
import { WORD_STYLE_OPTIONS } from '../../lib/onboardingOptions';
import { getOnboardingDraft, updateOnboardingDraft } from '../../services/onboarding';
import { cn } from '../../lib/utils';

export function WordStylePage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => {
    const draft = getOnboardingDraft();
    return WORD_STYLE_OPTIONS.find((o) => o.label === draft.wordStyle)?.id ?? 'mix';
  });

  function handleContinue() {
    const option = WORD_STYLE_OPTIONS.find((o) => o.id === selected);
    if (option) updateOnboardingDraft({ wordStyle: option.label });
    navigate('/onboarding/level');
  }

  return (
    <OnboardingShell step={1} totalSteps={6} skipTo="/onboarding/plan">
      <div className="flex flex-col items-center text-center mb-6 mt-2">
        <Otter mood="idle" size={88} breathe />
        <p className="text-sm text-ink-500 mt-3">Hi, I'm Curi. Let's set up your daily pouch.</p>
      </div>

      <h1 className="font-display text-display font-bold text-ink-900 leading-tight mb-5">
        What kind of words do you want?
      </h1>

      <div className="flex flex-col gap-2.5 flex-1">
        {WORD_STYLE_OPTIONS.map((opt) => {
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'text-left rounded-card border-2 p-4 transition-colors',
                active ? 'border-ink-900 bg-surface' : 'border-line bg-surface hover:border-line-strong'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink-900 text-sm">
                  {opt.label}
                  {opt.popular && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-ember-600 bg-ember-50 px-1.5 py-0.5 rounded-tag">
                      Popular
                    </span>
                  )}
                </p>
                {active && (
                  <span className="w-5 h-5 rounded-full bg-ink-900 text-paper flex items-center justify-center flex-shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500 mt-0.5">{opt.body}</p>
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
