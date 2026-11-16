import { supabase } from '../lib/superbase';
import { announceXp } from './xp';

export type QuizKind = 'daily' | 'learn' | 'review';

export interface QuizQuestion {
  idx: number;
  question: string;
  options: string[];
  /** One-time token for this question; the server only accepts an answer that carries it. */
  token?: string;
}

export interface QuizSession {
  session_id: string;
  kind: QuizKind;
  word_id: string | null;
  answered: number;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  xp: number;
  /** XP earned so far today (Lagos day), for the "XP today" indicator. */
  xp_today?: number;
  /** Why XP was reduced or refused (see xpReasonMessage). */
  reason?: string | null;
  /** Set on a failed word check: seconds until the word can be tested again (server clock). */
  retry_seconds?: number;
}

export interface AnswerResult {
  correct: boolean;
  correct_answer: string;
  /** One or two lines on why, sent only after the answer is graded. Null for older questions that have none. */
  explanation?: string | null;
  done: boolean;
  result: QuizResult | null;
}

/** Thrown when a failed "I know this" check locks the word for a while. */
export class CooldownError extends Error {
  seconds: number;
  constructor(seconds: number) {
    super(`Try again in ${Math.ceil(seconds / 60)} min`);
    this.seconds = seconds;
  }
}

/**
 * The server builds the questions and keeps the answers. The client only ever sees
 * prompts and options, and XP is awarded when the server finishes grading the session.
 */
async function begin(fn: string, args: Record<string, unknown>): Promise<QuizSession> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const cooldown = /cooldown:(\d+)/.exec(error.message);
    if (cooldown) throw new CooldownError(Number(cooldown[1]));
    throw new Error(error.message);
  }
  return data as QuizSession;
}

export function startQuiz(kind: QuizKind, wordId?: string): Promise<QuizSession> {
  return begin('start_quiz', { p_kind: kind, p_word_id: wordId ?? null });
}

/** The "Test me" check for one of today's facts: same shape, cooldown and grading as the word check. */
export function startFactQuiz(factId: string): Promise<QuizSession> {
  return begin('start_fact_quiz', { p_fact: factId });
}

export type ReviewFilter = 'all' | 'word' | 'fact';

/** A spaced-repetition review of saved words, saved facts, or both. */
export function startReviewQuiz(filter: ReviewFilter = 'all'): Promise<QuizSession> {
  return begin('start_review_quiz', { p_filter: filter });
}

/** Starts the right check for a word or a fact, so callers don't branch on the item type. */
export function startItemQuiz(itemType: 'word' | 'fact', id: string): Promise<QuizSession> {
  return itemType === 'fact' ? startFactQuiz(id) : startQuiz('learn', id);
}

/**
 * Submits one answer with that question's one-time token. A too-quick answer is retried once the server's
 * two-second floor has passed. A refused answer (replay, wrong token) comes back as an error.
 */
export async function answerQuiz(sessionId: string, idx: number, answer: string, token?: string): Promise<AnswerResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = token
      ? await supabase.rpc('answer_quiz', { p_session: sessionId, p_idx: idx, p_answer: answer, p_token: token })
      : await supabase.rpc('answer_quiz', { p_session: sessionId, p_idx: idx, p_answer: answer });
    if (!error) {
      if ((data as { rejected?: boolean })?.rejected) throw new Error('That answer was already counted.');
      const graded = data as AnswerResult;
      if (graded.done && graded.result) announceXp({ gained: graded.result.xp, reason: graded.result.reason });
      return graded;
    }
    if (!error.message.includes('too_fast')) throw new Error(error.message);
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error('Quiz answer was rejected');
}
