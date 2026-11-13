import { supabase } from '../lib/superbase';

export interface ChallengeQuestion {
  index: number;
  question: string;
  options: string[];
}

export interface ChallengeAnswer {
  index: number;
  answer: string;
  correct: boolean;
  correctAnswer: string;
}

export interface DailyChallengeState {
  number: number;
  total: number;
  questions: ChallengeQuestion[];
  /** Questions the user has already answered today, with the right answer revealed. */
  answers: ChallengeAnswer[];
  answered: number;
  score: number;
  completed: boolean;
  streak: number;
}

export interface ChallengeAnswerResult {
  correct: boolean;
  correctAnswer: string;
  completed: boolean;
  score: number;
  streak: number | null;
}

/**
 * Today's challenge: the same 5 questions for everyone (UTC day), one attempt.
 * The server holds the answer key and only reveals a right answer after you
 * have answered that question.
 */
export async function getDailyChallenge(): Promise<DailyChallengeState> {
  const { data, error } = await supabase.rpc('get_daily_challenge');
  if (error) throw new Error(error.message);
  const d = data as {
    number: number;
    total: number;
    questions: ChallengeQuestion[];
    answers: { index: number; answer: string; correct: boolean; correct_answer: string }[];
    answered: number;
    score: number;
    completed: boolean;
    streak: number;
  };
  return {
    number: d.number,
    total: d.total,
    questions: d.questions,
    answers: d.answers.map((a) => ({ index: a.index, answer: a.answer, correct: a.correct, correctAnswer: a.correct_answer })),
    answered: d.answered,
    score: d.score,
    completed: d.completed,
    streak: d.streak,
  };
}

export async function submitChallengeAnswer(index: number, answer: string): Promise<ChallengeAnswerResult> {
  const { data, error } = await supabase.rpc('submit_challenge_answer', { p_index: index, p_answer: answer });
  if (error) throw new Error(error.message);
  const d = data as { correct: boolean; correct_answer: string; completed: boolean; score: number; streak: number | null };
  return { correct: d.correct, correctAnswer: d.correct_answer, completed: d.completed, score: d.score, streak: d.streak };
}
