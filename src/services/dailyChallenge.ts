import { supabase } from '../lib/superbase';
import { announceXp } from './xp';

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
  /** One-time token for the question being asked now; the server rejects an answer without it. */
  token: string | null;
}

export interface ChallengeAnswerResult {
  correct: boolean;
  correctAnswer: string;
  completed: boolean;
  score: number;
  streak: number | null;
  /** XP this answer earned (2 per correct answer; less or none when over the daily limit or answered too fast). */
  xp: number;
  /** Why XP was reduced or refused (see xpReasonMessage). */
  reason: string | null;
}

/**
 * Today's challenge: the same 5 questions for everyone (Lagos day), one attempt.
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
    token: string | null;
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
    token: d.token ?? null,
  };
}

export async function submitChallengeAnswer(index: number, answer: string, token: string | null): Promise<ChallengeAnswerResult> {
  const { data, error } = await supabase.rpc('submit_challenge_answer', { p_index: index, p_answer: answer, ...(token ? { p_token: token } : {}) });
  if (error) throw new Error(error.message);
  const d = data as {
    rejected?: boolean; correct: boolean; correct_answer: string; completed: boolean; score: number;
    streak: number | null; xp?: number; reason?: string | null;
  };
  if (d.rejected) throw new Error('That answer was already counted.');
  if (d.correct) announceXp({ gained: d.xp ?? 0, reason: d.reason ?? null });
  return {
    correct: d.correct, correctAnswer: d.correct_answer, completed: d.completed, score: d.score, streak: d.streak,
    xp: d.xp ?? 0, reason: d.reason ?? null,
  };
}
