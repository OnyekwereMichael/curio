import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { OnboardingShell } from './OnboardingShell';
import { Button } from '../../components/ui/Button';
import { TOPIC_OPTIONS } from '../../mocks/onboarding';
import { getOnboardingDraft, updateOnboardingDraft } from '../../services/onboarding';
import { cn } from '../../lib/utils';

export function FactTopicsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(() => getOnboardingDraft().factTopics);
  const [surpriseMe, setSurpriseMe] = useState(false);

  function toggle(topic: string) {
    setSurpriseMe(false);
    setSelected((prev) => (prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]));
  }

  function handleContinue() {
    updateOnboardingDraft({ factTopics: surpriseMe ? [] : selected });
    navigate('/onboarding/goal-reminder');
  }

  return (
    <OnboardingShell step={4} totalSteps={6} backTo="/onboarding/words-per-day" skipTo="/onboarding/plan">
      <h1 className="font-display text-display font-bold text-ink-900 leading-tight mb-1 mt-4">
        What should your facts be about?
      </h1>
      <p className="text-sm text-ink-500 mb-5">Pick 3 or more. We rotate through them.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {TOPIC_OPTIONS.map((topic) => {
          const active = !surpriseMe && selected.includes(topic);
          return (
            <button
              key={topic}
              onClick={() => toggle(topic)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-semibold transition-colors',
                active ? 'bg-ink-900 text-paper' : 'bg-ink-900/5 text-ink-900 hover:bg-ink-900/10'
              )}
            >
              {active && '✓ '}
              {topic}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setSurpriseMe((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-card border-2 border-dashed p-3 text-sm font-semibold transition-colors',
          surpriseMe ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-line-strong text-ink-900 hover:bg-ink-900/5'
        )}
      >
        <Shuffle size={16} />
        Random, surprise me
      </button>

      <p className="text-xs text-ink-500 mt-3">{surpriseMe ? 'Surprise me selected' : `${selected.length} selected`}</p>

      <div className="flex-1" />

      <Button onClick={handleContinue} disabled={!surpriseMe && selected.length === 0} className="w-full mt-6">
        Continue
      </Button>
    </OnboardingShell>
  );
}
