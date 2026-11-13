import { updateLearningPlan } from './learningPlan';
import { clearDailyPlanCache } from './dailyPlan';

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

// Answers are kept in memory (and sessionStorage, so a refresh mid-wizard
// doesn't lose them) for the synchronous reads the step pages do, and each
// step is also saved to `user_preferences` as it's answered. That means a
// user who drops out halfway still has their partial answers stored.
const STORAGE_KEY = 'curi_onboarding_draft';

function load(): OnboardingDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_DRAFT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_DRAFT };
}

function persistLocal() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

let draft: OnboardingDraft = load();

export function getOnboardingDraft(): OnboardingDraft {
  return { ...draft };
}

export function updateOnboardingDraft(patch: Partial<OnboardingDraft>) {
  draft = { ...draft, ...patch };
  persistLocal();
  // Fire-and-forget: a failed per-step save must never block the wizard.
  // completeOnboarding() writes the full draft again at the end.
  updateLearningPlan(patch).catch((e) => console.warn('onboarding step save failed', e));
}

export function resetOnboardingDraft() {
  draft = { ...DEFAULT_DRAFT };
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Writes the full plan, stamps onboarded_at and the user's timezone. */
export async function completeOnboarding(): Promise<void> {
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // ignore
  }
  await updateLearningPlan({ ...draft }, { onboarded_at: new Date().toISOString(), timezone });
  // Preferences just changed — make sure the next Home load builds a fresh plan.
  clearDailyPlanCache();
  resetOnboardingDraft();
}
