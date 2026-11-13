import { supabase } from '../lib/superbase';

// Real queries, new this pass — not a refactor of the existing
// useWordCardInteractions/useStreak paths, just small reads the new
// plan-row and Progress screens need and those hooks don't expose.

export interface WordProgressStatus {
  markedKnown: boolean;
  saved: boolean;
}

export async function fetchWordProgress(userId: string, wordId: string): Promise<WordProgressStatus | null> {
  const { data, error } = await supabase
    .from('user_word_progress')
    .select('marked_known, saved')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .maybeSingle();

  if (error) {
    console.error('fetchWordProgress failed:', error.message);
    return null;
  }
  return data ? { markedKnown: !!data.marked_known, saved: !!data.saved } : null;
}

export interface TodayActivity {
  quizCompleted: boolean;
  quizScore: number | null;
  quizPerfect: boolean;
}

export async function fetchTodayActivity(userId: string): Promise<TodayActivity | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('user_activity_log')
    .select('quiz_completed, quiz_score, quiz_perfect')
    .eq('user_id', userId)
    .eq('activity_date', today)
    .maybeSingle();

  if (error) {
    console.error('fetchTodayActivity failed:', error.message);
    return null;
  }
  return data
    ? { quizCompleted: !!data.quiz_completed, quizScore: data.quiz_score, quizPerfect: !!data.quiz_perfect }
    : null;
}

export interface MonthActivityDay {
  activityDate: string;
  quizCompleted: boolean;
  quizPerfect: boolean;
}

/** Used by the new /progress page's month calendar. */
export async function fetchActivityRange(userId: string, fromDateIso: string): Promise<MonthActivityDay[]> {
  const { data, error } = await supabase
    .from('user_activity_log')
    .select('activity_date, quiz_completed, quiz_perfect')
    .eq('user_id', userId)
    .gte('activity_date', fromDateIso);

  if (error) {
    console.error('fetchActivityRange failed:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    activityDate: row.activity_date,
    quizCompleted: !!row.quiz_completed,
    quizPerfect: !!row.quiz_perfect,
  }));
}

export interface WordStats {
  wordsLearned: number;
  topicsExplored: number;
}

/** Words marked known + distinct categories seen, both real aggregates over user_word_progress/words. */
export async function fetchWordStats(userId: string): Promise<WordStats> {
  const { data, error } = await supabase
    .from('user_word_progress')
    .select('marked_known, words(category)')
    .eq('user_id', userId);

  if (error) {
    console.error('fetchWordStats failed:', error.message);
    return { wordsLearned: 0, topicsExplored: 0 };
  }

  const rows = (data ?? []) as unknown as { marked_known: boolean; words: { category: string | null } | null }[];
  const wordsLearned = rows.filter((r) => r.marked_known).length;
  const topicsExplored = new Set(rows.map((r) => r.words?.category).filter(Boolean)).size;
  return { wordsLearned, topicsExplored };
}

export interface QuizAccuracy {
  accuracyPct: number | null;
  quizzesTaken: number;
}

/** Derived from user_activity_log — real, no mastery/XP system needed. */
export async function fetchQuizAccuracy(userId: string): Promise<QuizAccuracy> {
  const { data, error } = await supabase
    .from('user_activity_log')
    .select('quiz_completed, quiz_perfect')
    .eq('user_id', userId)
    .eq('quiz_completed', true);

  if (error) {
    console.error('fetchQuizAccuracy failed:', error.message);
    return { accuracyPct: null, quizzesTaken: 0 };
  }
  const rows = data ?? [];
  if (rows.length === 0) return { accuracyPct: null, quizzesTaken: 0 };
  const perfect = rows.filter((r) => r.quiz_perfect).length;
  return { accuracyPct: Math.round((perfect / rows.length) * 100), quizzesTaken: rows.length };
}

export interface WeeklyProgress {
  /** The user's chosen weekly goal (3, 5 or 7 days). */
  goalDays: number;
  /** Days this week (Monday-first, UTC like activity_date) with a completed quiz. */
  doneDays: number;
  /** Mon..Sun, true where that day was completed. */
  week: boolean[];
  /** Index (0 = Monday) of today within `week`. */
  todayIndex: number;
}

const DEFAULT_WEEKLY_GOAL = 5;

/** Completed days since Monday against user_preferences.weekly_goal. No extra table: derived from user_activity_log. */
export async function fetchWeeklyProgress(userId: string): Promise<WeeklyProgress> {
  const now = new Date();
  const todayIndex = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - todayIndex));
  const mondayKey = monday.toISOString().split('T')[0];

  const [prefs, log] = await Promise.all([
    supabase.from('user_preferences').select('weekly_goal').eq('user_id', userId).maybeSingle(),
    supabase
      .from('user_activity_log')
      .select('activity_date')
      .eq('user_id', userId)
      .eq('quiz_completed', true)
      .gte('activity_date', mondayKey),
  ]);
  if (log.error) console.error('fetchWeeklyProgress failed:', log.error.message);

  const week = Array<boolean>(7).fill(false);
  for (const row of log.data ?? []) {
    const offset = Math.round((Date.parse(row.activity_date as string) - monday.getTime()) / 86400000);
    if (offset >= 0 && offset < 7) week[offset] = true;
  }
  return {
    goalDays: prefs.data?.weekly_goal ?? DEFAULT_WEEKLY_GOAL,
    doneDays: week.filter(Boolean).length,
    week,
    todayIndex,
  };
}

/** Words whose review mastery has reached 'mastered' (see rate_review). */
export async function fetchMasteredCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_word_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('mastery', 'mastered');
  if (error) {
    console.error('fetchMasteredCount failed:', error.message);
    return 0;
  }
  return count ?? 0;
}
