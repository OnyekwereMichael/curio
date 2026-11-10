export interface LearningPlanFixture {
  wordStyle: string;
  level: string;
  wordsPerDay: number;
  factTopics: string[];
  weeklyGoalDays: number;
  reminderTime: string;
  eveningNudge: boolean;
  weeklyRecapEmail: boolean;
}

// Fixture only — see docs/BACKEND_TODO.md #1 (user_preferences table).
export const MOCK_LEARNING_PLAN: LearningPlanFixture = {
  wordStyle: 'A mix',
  level: 'Intermediate',
  wordsPerDay: 3,
  factTopics: ['Animals', 'Space', 'History'],
  weeklyGoalDays: 5,
  reminderTime: '8:00 AM',
  eveningNudge: true,
  weeklyRecapEmail: false,
};
