import { MOCK_LEARNING_PLAN, type LearningPlanFixture } from '../mocks/learningPlan';

export type { LearningPlanFixture };

// TODO(backend): replace with a real read/write of `user_preferences`.
// See docs/BACKEND_TODO.md #1. Edits here don't persist across reloads —
// there's nowhere real to put them yet.
let current: LearningPlanFixture = { ...MOCK_LEARNING_PLAN };

export async function getLearningPlan(): Promise<LearningPlanFixture> {
  await new Promise((r) => setTimeout(r, 100));
  return { ...current };
}

export async function updateLearningPlan(patch: Partial<LearningPlanFixture>): Promise<LearningPlanFixture> {
  current = { ...current, ...patch };
  await new Promise((r) => setTimeout(r, 100));
  return { ...current };
}
