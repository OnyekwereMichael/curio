import { updateLearningPlan } from './learningPlan';

export interface OnboardingDraft {
  wordStyle: string;
  level: string;
  wordsPerDay: number;
  factTopics: string[];
  weeklyGoalDays: number;
  reminderTime: string;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  wordStyle: 'A mix',
  level: 'Intermediate',
  wordsPerDay: 3,
  factTopics: [],
  weeklyGoalDays: 5,
  reminderTime: 'Morning',
};

// TODO(backend): this in-memory draft becomes a real write to
// `user_preferences` once it exists — see docs/BACKEND_TODO.md #1.
// Resets on reload; it's just carrying answers between wizard steps.
let draft: OnboardingDraft = { ...DEFAULT_DRAFT };

export function getOnboardingDraft(): OnboardingDraft {
  return { ...draft };
}

export function updateOnboardingDraft(patch: Partial<OnboardingDraft>) {
  draft = { ...draft, ...patch };
}

export function resetOnboardingDraft() {
  draft = { ...DEFAULT_DRAFT };
}

/** Seeds the (also mocked) learning-plan settings with what onboarding collected. */
export async function completeOnboarding(): Promise<void> {
  await updateLearningPlan({
    wordStyle: draft.wordStyle,
    level: draft.level,
    wordsPerDay: draft.wordsPerDay,
    factTopics: draft.factTopics,
    weeklyGoalDays: draft.weeklyGoalDays,
    reminderTime: draft.reminderTime,
  });
}
