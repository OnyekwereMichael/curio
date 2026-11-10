import { MOCK_DAILY_QUESTS, type DailyQuestFixture } from '../mocks/quests';

export interface DailyQuests {
  quests: DailyQuestFixture[];
  completedCount: number;
}

// TODO(backend): replace with a real read of `daily_quests` for
// (user_id, today), once xp_events/daily_quests/users.total_xp exist.
// See docs/BACKEND_TODO.md #3.
export async function getDailyQuests(): Promise<DailyQuests> {
  await new Promise((r) => setTimeout(r, 120));
  return {
    quests: MOCK_DAILY_QUESTS,
    completedCount: MOCK_DAILY_QUESTS.filter((q) => q.completed).length,
  };
}

// TODO(backend): replace with a real xp_events insert + sum once XP exists.
// Pure/sync for now since it's just UI decoration on the quiz result.
export function estimateQuizXp(correctCount: number, total: number): number {
  const perfectBonus = total > 0 && correctCount === total ? 15 : 0;
  return correctCount * 5 + 10 + perfectBonus;
}
