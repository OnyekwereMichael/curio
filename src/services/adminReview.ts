import { supabase } from '../lib/superbase';

export type ReviewDecision = 'approved' | 'rejected' | 'disqualified';
export type FlagSeverity = 'low' | 'medium' | 'high';

export interface RiskFlag {
  type: string;
  severity: FlagSeverity;
  evidence: Record<string, string | number>;
}

export interface ReviewRow {
  rank: number;
  userId: string;
  name: string | null;
  email: string | null;
  xp: number;
  reachedAt: string;
  sources: Record<string, number>;
  winner: {
    id: string;
    rank: number;
    prizeAmount: number;
    currency: string;
    reviewStatus: 'pending' | ReviewDecision;
    paidStatus: string;
    reviewNotes: string | null;
  } | null;
  risk: { flags: RiskFlag[]; score: number; verdict: 'Suspicious' | 'Looks genuine' };
  proof: {
    wordsLearned: number;
    answers: number;
    accuracy: number | null;
    medianAnswerMs: number | null;
    activeDays: number;
    reviewAnswers: number;
    rejectedAttempts: number;
  };
  sharedWith: { name: string | null; email: string | null }[];
}

export interface WeekReview {
  weekStart: string;
  weekEnd: string;
  minWeeklyXp: number;
  finalized: boolean;
  rows: ReviewRow[];
}

export interface UserDetail {
  timeline: { at: string; source: string; amount: number; ref: string; timeMs: number | null; correct: boolean | null }[];
  perHour: { hour: string; xp: number; events: number }[];
  rejections: { at: string; source: string; ref: string | null; reason: string }[];
}

export interface AuditEntry {
  at: string;
  action: string;
  target: Record<string, unknown> | null;
  detail: Record<string, unknown> | null;
}

/** Start of a Lagos week (Monday 00:00, UTC+1) as an ISO instant. offset 0 = this week, 1 = last week, ... */
export function lagosWeekStart(offset = 0): string {
  const l = new Date(Date.now() + 3600000);
  const dow = (l.getUTCDay() + 6) % 7;
  const monday = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate() - dow);
  return new Date(monday - 3600000 - offset * 7 * 86400000).toISOString();
}

export async function adminWeekReview(weekStart: string): Promise<WeekReview> {
  const { data, error } = await supabase.rpc('admin_week_review', { p_week: weekStart });
  if (error) throw new Error(error.message);
  const d = data as any;
  return {
    weekStart: d.week_start,
    weekEnd: d.week_end,
    minWeeklyXp: d.min_weekly_xp,
    finalized: d.finalized,
    rows: (d.rows ?? []).map((r: any): ReviewRow => ({
      rank: r.rank,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      xp: r.xp,
      reachedAt: r.reached_at,
      sources: r.sources ?? {},
      winner: r.winner
        ? {
            id: r.winner.id,
            rank: r.winner.rank,
            prizeAmount: r.winner.prize_amount,
            currency: r.winner.currency,
            reviewStatus: r.winner.review_status,
            paidStatus: r.winner.paid_status,
            reviewNotes: r.winner.review_notes,
          }
        : null,
      risk: r.risk,
      proof: {
        wordsLearned: r.proof.words_learned,
        answers: r.proof.answers,
        accuracy: r.proof.accuracy,
        medianAnswerMs: r.proof.median_answer_ms,
        activeDays: r.proof.active_days,
        reviewAnswers: r.proof.review_answers,
        rejectedAttempts: r.proof.rejected_attempts,
      },
      sharedWith: r.shared_with ?? [],
    })),
  };
}

export async function adminUserDetail(weekStart: string, userId: string): Promise<UserDetail> {
  const { data, error } = await supabase.rpc('admin_user_detail', { p_week: weekStart, p_user: userId });
  if (error) throw new Error(error.message);
  const d = data as any;
  return {
    timeline: (d.timeline ?? []).map((t: any) => ({ at: t.at, source: t.source, amount: t.amount, ref: t.ref, timeMs: t.time_ms, correct: t.correct })),
    perHour: d.per_hour ?? [],
    rejections: d.rejections ?? [],
  };
}

export async function adminReviewWinner(winnerId: string, decision: ReviewDecision, notes: string): Promise<{ status: string; promotedUser: string | null }> {
  const { data, error } = await supabase.rpc('admin_review_winner', { p_winner: winnerId, p_decision: decision, p_notes: notes || null });
  if (error) throw new Error(error.message);
  return { status: data.status, promotedUser: data.promoted_user ?? null };
}

export async function adminAuditTrail(limit = 50): Promise<AuditEntry[]> {
  const { data, error } = await supabase.rpc('admin_audit_trail', { p_limit: limit });
  if (error) throw new Error(error.message);
  return data as AuditEntry[];
}
