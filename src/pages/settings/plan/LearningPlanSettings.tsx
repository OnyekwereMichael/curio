import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '../../../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { getLearningPlan, updateLearningPlan, type LearningPlan } from '../../../services/learningPlan';
import { cn } from '../../../lib/utils';

import { WORDS_PER_DAY_OPTIONS, TOPIC_OPTIONS } from '../../../lib/onboardingOptions';

/** Backed by `user_preferences` via services/learningPlan. */
export function LearningPlanSettingsPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLearningPlan().then(setPlan);
  }, []);

  if (!plan) {
    return (
      <AppShell title="My learning plan">
        <div className="py-5 max-w-lg mx-auto w-full animate-pulse h-64 bg-surface rounded-card border border-line" />
      </AppShell>
    );
  }

  function toggleTopic(topic: string) {
    if (!plan) return;
    const has = plan.factTopics.includes(topic);
    setPlan({ ...plan, factTopics: has ? plan.factTopics.filter((t) => t !== topic) : [...plan.factTopics, topic] });
  }

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    try {
      await updateLearningPlan(plan);
      navigate('/settings/plan/when');
    } catch (e) {
      console.error('save learning plan failed', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="My learning plan">
      <div className="py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1 text-ink-500 hover:text-ink-900 transition-colors text-sm font-ui self-start"
        >
          <ChevronLeft size={18} />
          Settings
        </button>

        <h1 className="font-display text-display font-bold text-ink-900">My learning plan</h1>

        <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line font-ui">
          <button className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="text-sm text-ink-500">Word style</span>
            <span className="text-sm font-semibold text-ink-900">{plan.wordStyle}</span>
          </button>
          <button className="w-full flex items-center justify-between px-4 py-3.5 text-left">
            <span className="text-sm text-ink-500">Level</span>
            <span className="text-sm font-semibold text-ink-900">{plan.level}</span>
          </button>
        </div>

        <div className="bg-surface rounded-card border border-line shadow-card p-4 font-ui">
          <p className="text-sm font-semibold text-ink-900 mb-3">Words per day</p>
          <div className="flex rounded-control border border-line-strong p-0.5">
            {WORDS_PER_DAY_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setPlan({ ...plan, wordsPerDay: n })}
                className={cn(
                  'flex-1 py-2 rounded-tag text-sm font-semibold transition-colors',
                  plan.wordsPerDay === n ? 'bg-ink-900 text-paper' : 'text-ink-500 hover:text-ink-900'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-card border border-line shadow-card p-4 font-ui">
          <p className="text-sm font-semibold text-ink-900 mb-3">Fact topics</p>
          <div className="flex flex-wrap gap-2">
            {TOPIC_OPTIONS.map((topic) => {
              const active = plan.factTopics.includes(topic);
              return (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    active ? 'bg-ink-900 text-paper' : 'bg-ink-900/5 text-ink-900 hover:bg-ink-900/10'
                  )}
                >
                  {active && '✓ '}
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line font-ui">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-500">Weekly goal</span>
            <span className="text-sm font-semibold text-ink-900">{plan.weeklyGoalDays} days</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-ink-500">Reminder</span>
            <span className="text-sm font-semibold text-ink-900">{plan.reminderTime}</span>
          </div>
        </div>

        <Button onClick={handleSave} isLoading={saving} className="w-full">
          Save changes
        </Button>
      </div>
    </AppShell>
  );
}
