export type Mastery = 'new' | 'learning' | 'mastered';

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
};

// Reviews are server-graded quiz sessions now (see services/quiz.ts, startQuiz('review')).
// The server decides which saved words are due, grades each answer, and schedules the next
// review from whether it was actually recalled — there is no self-rating any more.
