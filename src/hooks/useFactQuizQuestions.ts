// src/hooks/useFactQuizQuestions.ts
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export function buildFactQuizQuestions(
  fact: { quiz_questions?: { question: string; correct: string; wrong: string[] }[] } | null,
  count: 1 | 2
): QuizQuestion[] {
  if (!fact?.quiz_questions) return [];

  return fact.quiz_questions.slice(0, count).map((q) => ({
    question: q.question,
    correctAnswer: q.correct,
    options: [q.correct, ...q.wrong].sort(() => Math.random() - 0.5),
  }));
}