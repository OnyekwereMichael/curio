import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { getOnboardingDraft, completeOnboarding } from '../../services/onboarding';

export function PlanSummaryPage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const draft = getOnboardingDraft();

  async function handleStart() {
    setStarting(true);
    await completeOnboarding();
    // Onboarding is done — continue into the real install-nudge flow.
    navigate('/install-nudge');
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui px-5 py-8">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1">
        <div className="flex flex-col items-center text-center mb-6">
          <Otter mood="cheering" size={100} />
          <h1 className="font-display text-display font-bold text-ink-900 leading-tight mt-4">
            Here's your daily plan
          </h1>
          <p className="text-sm text-ink-500 mt-1">About 4 minutes, every morning.</p>
        </div>

        <div className="bg-surface rounded-sheet border border-line shadow-raised divide-y divide-line">
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="font-display text-xl font-bold text-ember-600 w-6 flex-shrink-0">{draft.wordsPerDay}</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">words a day</p>
              <p className="text-xs text-ink-500">{draft.wordStyle} · {draft.level}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="font-display text-xl font-bold text-ember-600 w-6 flex-shrink-0">1</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">fact a day</p>
              <p className="text-xs text-ink-500">
                {draft.factTopics.length > 0 ? draft.factTopics.join(', ') : 'Surprise me'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="font-display text-xl font-bold text-ember-600 w-6 flex-shrink-0">1</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">quiz a day</p>
              <p className="text-xs text-ink-500">5 questions, counts your streak</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-4">
            <span className="font-display text-xl font-bold text-ember-600 w-6 flex-shrink-0">{draft.weeklyGoalDays}</span>
            <div>
              <p className="text-sm font-semibold text-ink-900">days a week</p>
              <p className="text-xs text-ink-500">Reminder: {draft.reminderTime}</p>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <Button onClick={handleStart} isLoading={starting} className="w-full mt-6">
          Start today's plan
        </Button>
        <p className="text-xs text-ink-500 text-center mt-2">Change anything later in Settings.</p>
      </div>
    </div>
  );
}
