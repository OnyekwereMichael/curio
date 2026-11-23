import { supabase } from '../lib/superbase';

export type ClaimStatus = 'pending' | 'submitted' | 'paid' | 'expired' | 'void';

export interface WinnerBlock {
  id: string;
  rank: number;
  prizeAmount: number;
  currency: string;
  status: ClaimStatus;
  claimDeadline: string;
}

/** The last finished week, for the results modal. */
export interface WeekResult {
  weekStart: string;
  weekEnd: string;
  rank: number;
  xp: number;
  participants: number;
  minWeeklyXp: number;
  currency: string;
  /** XP of whoever finished 3rd, for "you were N XP away". Null if fewer than 3 people played. */
  thirdXp: number | null;
  winner: WinnerBlock | null;
  /** Set when an admin disqualified this player for the week; `reason` is the admin's brief note. */
  removal: { reason: string | null } | null;
}

/** A prize the user won and may still need to act on (or has been paid). */
export interface PrizeClaim {
  id: string;
  weekStart: string;
  rank: number;
  xp: number;
  prizeAmount: number;
  currency: string;
  status: ClaimStatus;
  claimDeadline: string;
  submittedAt: string | null;
  paidAt: string | null;
  bankName: string | null;
  accountLast4: string | null;
  accountName: string | null;
}

export interface MyResults {
  unseen: WeekResult | null;
  claims: PrizeClaim[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const toWinner = (w: any): WinnerBlock | null =>
  w
    ? { id: w.id, rank: w.rank, prizeAmount: w.prize_amount, currency: w.currency, status: w.status, claimDeadline: w.claim_deadline }
    : null;

export async function getMyResults(): Promise<MyResults> {
  const { data, error } = await supabase.rpc('get_my_results');
  if (error) throw new Error(error.message);
  const u = data?.unseen;
  return {
    unseen: u
      ? {
          weekStart: u.week_start,
          weekEnd: u.week_end,
          rank: u.rank,
          xp: u.xp,
          participants: u.participants,
          minWeeklyXp: u.min_weekly_xp,
          currency: u.currency,
          thirdXp: u.third_xp ?? null,
          winner: toWinner(u.winner),
          removal: u.removal ? { reason: u.removal.reason ?? null } : null,
        }
      : null,
    claims: ((data?.claims ?? []) as any[]).map((c) => ({
      id: c.id,
      weekStart: c.week_start,
      rank: c.rank,
      xp: c.xp,
      prizeAmount: c.prize_amount,
      currency: c.currency,
      status: c.status,
      claimDeadline: c.claim_deadline,
      submittedAt: c.submitted_at,
      paidAt: c.paid_at,
      bankName: c.bank_name,
      accountLast4: c.account_last4,
      accountName: c.account_name,
    })),
  };
}

export async function markResultsSeen(weekStart: string): Promise<void> {
  const { error } = await supabase.rpc('mark_results_seen', { p_week_start: weekStart });
  if (error) console.error('mark_results_seen failed', error.message);
}

export async function submitPayoutDetails(
  winnerId: string,
  details: { bank: string; accountNumber: string; accountName: string }
): Promise<{ accountLast4: string }> {
  const { data, error } = await supabase.rpc('submit_payout_details', {
    p_winner: winnerId,
    p_bank: details.bank,
    p_account_number: details.accountNumber,
    p_account_name: details.accountName,
  });
  if (error) throw new Error(error.message);
  return { accountLast4: data?.account_last4 ?? '' };
}

/* ───────────── admin ───────────── */

export interface AdminWinner {
  id: string;
  weekStart: string;
  rank: number;
  xp: number;
  prizeAmount: number;
  currency: string;
  status: ClaimStatus;
  claimDeadline: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  reminder24hAt: string | null;
  reminder72hAt: string | null;
  name: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
}

export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export async function adminListWinners(status?: ClaimStatus): Promise<AdminWinner[]> {
  const { data, error } = await supabase.rpc('admin_list_winners', { p_status: status ?? null });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    weekStart: r.week_start,
    rank: r.rank,
    xp: r.xp,
    prizeAmount: r.prize_amount,
    currency: r.currency,
    status: r.status,
    claimDeadline: r.claim_deadline,
    submittedAt: r.submitted_at,
    paidAt: r.paid_at,
    paymentReference: r.payment_reference,
    reminder24hAt: r.reminder_24h_at,
    reminder72hAt: r.reminder_72h_at,
    name: r.name,
    email: r.email,
    bankName: r.bank_name,
    accountNumber: r.account_number,
    accountName: r.account_name,
  }));
}

export async function adminMarkPaid(winnerId: string, reference?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_mark_paid', { p_winner: winnerId, p_reference: reference ?? null });
  if (error) throw new Error(error.message);
}
