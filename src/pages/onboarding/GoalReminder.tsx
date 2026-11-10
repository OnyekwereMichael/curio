import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { OnboardingShell } from './OnboardingShell';
import { Button } from '../../components/ui/Button';
import { WEEKLY_GOAL_OPTIONS, REMINDER_TIME_OPTIONS } from '../../mocks/onboarding';
import { getOnboardingDraft, updateOnboardingDraft } from '../../services/onboarding';
import { cn } from '../../lib/utils';

const GOAL_LABELS: Record<number, string> = { 3: 'Easy', 5: 'Steady', 7: 'Daily' };

export function GoalReminderPage() {
  const navigate = useNavigate();
  const [weeklyGoalDays, setWeeklyGoalDays] = useState(() => getOnboardingDraft().weeklyGoalDays);
  const [reminderTime, setReminderTime] = useState(() => getOnboardingDraft().reminderTime);

  function handleContinue() {
    updateOnboardingDraft({ weeklyGoalDays, reminderTime });
    navigate('/onboarding/plan');
  }

  return (
    <OnboardingShell step={5} totalSteps={6} backTo="/onboarding/fact-topics" skipTo="/onboarding/plan">
      <h1 className="font-display text-display font-bold text-ink-900 leading-tight mb-5 mt-4">
        Set a gentle rhythm
      </h1>

      <div className="bg-surface rounded-card border border-line shadow-card p-4 mb-4">
        <p className="text-sm font-semibold text-ink-900 mb-3">Days a week</p>
        <div className="flex rounded-control border border-line-strong p-0.5">
          {WEEKLY_GOAL_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setWeeklyGoalDays(n)}
              className={cn(
                'flex-1 py-2 rounded-tag text-sm font-semibold transition-colors',
                weeklyGoalDays === n ? 'bg-ink-900 text-paper' : 'text-ink-500 hover:text-ink-900'
              )}
            >
              {n} · {GOAL_LABELS[n]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-card border border-line shadow-card p-4">
        <p className="text-sm font-semibold text-ink-900 mb-3">Remind me at</p>
        <div className="flex gap-2">
          {REMINDER_TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setReminderTime(t)}
              className={cn(
                'flex-1 py-2.5 rounded-control border text-sm font-semibold transition-colors',
                reminderTime === t ? 'border-ink-900 bg-ink-900 text-paper' : 'border-line-strong text-ink-900 hover:bg-ink-900/5'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <Button onClick={handleContinue} className="w-full mt-6">
        See my plan
      </Button>
    </OnboardingShell>
  );
}
