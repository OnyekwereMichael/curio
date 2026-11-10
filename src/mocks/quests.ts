export interface DailyQuestFixture {
  id: string;
  label: string;
  xp: number;
  completed: boolean;
}

// Fixture only — see docs/BACKEND_TODO.md #3 (XP/levels/quests) for the
// real daily_quests shape this will be replaced with.
export const MOCK_DAILY_QUESTS: DailyQuestFixture[] = [
  { id: 'learn-words', label: "Learn today's words", xp: 20, completed: true },
  { id: 'quiz-4-of-5', label: 'Get 4 of 5 on the quiz', xp: 30, completed: false },
  { id: 'review-3', label: 'Review 3 saved words', xp: 15, completed: false },
];
