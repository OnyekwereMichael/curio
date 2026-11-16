import { supabase } from '../lib/superbase';

export type QuizKind = 'daily' | 'learn' | 'review';

export interface QuizQuestion {
  idx: number;
  question: string;
  options: string[];
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
  /** Set on a failed word check: seconds until the word can be tested again (server clock). */
  retry_seconds?: number;
}

export interface AnswerResult {
  correct: boolean;
  correct_answer: string;
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
export async function startQuiz(kind: QuizKind, wordId?: string): Promise<QuizSession> {
  const { data, error } = await supabase.rpc('start_quiz', { p_kind: kind, p_word_id: wordId ?? null });
  if (error) {
    const cooldown = /cooldown:(\d+)/.exec(error.message);
    if (cooldown) throw new CooldownError(Number(cooldown[1]));
    throw new Error(error.message);
  }
  return data as QuizSession;
}

/** Submits one answer. A too-quick answer is retried once the server's two-second floor has passed. */
export async function answerQuiz(sessionId: string, idx: number, answer: string): Promise<AnswerResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc('answer_quiz', { p_session: sessionId, p_idx: idx, p_answer: answer });
    if (!error) return data as AnswerResult;
    if (!error.message.includes('too_fast')) throw new Error(error.message);
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error('Quiz answer was rejected');
}
