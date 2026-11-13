import { supabase } from '../lib/superbase';

export interface LearningPlan {
  wordStyle: string;
  level: string;
  wordsPerDay: number;
  factTopics: string[];
  weeklyGoalDays: number;
  reminderTime: string;
  eveningNudge: boolean;
  weeklyRecapEmail: boolean;
}

// Defaults for a user who has no user_preferences row yet (existing users).
const DEFAULT_PLAN: LearningPlan = {
  wordStyle: 'A mix',
  level: 'Intermediate',
  wordsPerDay: 3,
  factTopics: [],
  weeklyGoalDays: 5,
  reminderTime: 'Morning',
  eveningNudge: true,
  weeklyRecapEmail: false,
};

type Row = {
  word_style: string | null;
  level: string | null;
  words_per_day: number;
  fact_topics: string[];
  weekly_goal: number;
  reminder_time: string | null;
  evening_nudge: boolean;
  weekly_recap_email: boolean;
};

function fromRow(r: Row): LearningPlan {
  return {
    wordStyle: r.word_style ?? DEFAULT_PLAN.wordStyle,
    level: r.level ?? DEFAULT_PLAN.level,
    wordsPerDay: r.words_per_day,
    factTopics: r.fact_topics ?? [],
    weeklyGoalDays: r.weekly_goal,
    reminderTime: r.reminder_time ?? DEFAULT_PLAN.reminderTime,
    eveningNudge: r.evening_nudge,
    weeklyRecapEmail: r.weekly_recap_email,
  };
}

function toRow(p: Partial<LearningPlan>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.wordStyle !== undefined) out.word_style = p.wordStyle;
  if (p.level !== undefined) out.level = p.level;
  if (p.wordsPerDay !== undefined) out.words_per_day = p.wordsPerDay;
  if (p.factTopics !== undefined) out.fact_topics = p.factTopics;
  if (p.weeklyGoalDays !== undefined) out.weekly_goal = p.weeklyGoalDays;
  if (p.reminderTime !== undefined) out.reminder_time = p.reminderTime;
  if (p.eveningNudge !== undefined) out.evening_nudge = p.eveningNudge;
  if (p.weeklyRecapEmail !== undefined) out.weekly_recap_email = p.weeklyRecapEmail;
  return out;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

export async function getLearningPlan(): Promise<LearningPlan> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('user_preferences')
    .select('word_style, level, words_per_day, fact_topics, weekly_goal, reminder_time, evening_nudge, weekly_recap_email')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : { ...DEFAULT_PLAN };
}

/** Upserts only the fields in `patch`; other columns keep their current/default values. */
export async function updateLearningPlan(
  patch: Partial<LearningPlan>,
  extra: Record<string, unknown> = {},
): Promise<LearningPlan> {
  const userId = await currentUserId();
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...toRow(patch), ...extra }, { onConflict: 'user_id' });
  if (error) throw error;
  return getLearningPlan();
}

export async function isOnboarded(): Promise<boolean> {
  const userId = await currentUserId();
  const { data } = await supabase
    .from('user_preferences')
    .select('onboarded_at')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.onboarded_at;
}
