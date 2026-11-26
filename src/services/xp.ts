import { supabase } from '../lib/superbase';

// Amounts are NOT defined here: the server owns them (tables xp_rules and xp_settings).
// The quests panel reads each quest's xp from daily_quests and result screens show the XP the server reports back.
export interface DailyQuest {
  id: string;
  label: string;
  xp: number;
  completed: boolean;
}

export interface DailyQuests {
  quests: DailyQuest[];
  completedCount: number;
}

export interface XpSyncResult {
  total_xp: number;
  level: number;
  new_badges: string[];
  xp_today?: number;
  reason?: string | null;
}

/** Everything an XP display needs, read from the ledger by one server function. */
export interface XpStatus {
  totalXp: number;
  level: number;
  today: number;
  ceilingFull: number;
  ceilingHalf: number;
  weekXp: number;
  minWeeklyXp: number;
  /** The Lagos calendar day the server counted this for (yyyy-mm-dd). */
  day: string;
}

// Fired after anything that can change XP (quiz finished, word marked known)
// so panels showing XP/quests can refetch.
export const XP_UPDATED_EVENT = 'curi:xp-updated';
// Fired when an action earned (or was refused) XP, so a small "+N XP" note can be shown.
export const XP_GAINED_EVENT = 'curi:xp-gained';

export interface XpGainedDetail {
  gained: number;
  reason?: string | null;
}

const QUEST_LABELS: Record<string, string> = {
  learn_words: "Learn today's words",
  quiz_score: 'Get 4 of 5 on the quiz',
  review_3: 'Review 3 saved words',
  learn_facts: "Pass today's fact check",
};

export interface XpRule {
  rule: string;
  amount: number;
  enabled: boolean;
  /** When the rule starts paying. Null means it is already live. */
  effectiveFrom: string | null;
}

/** What a reward chip should say, decided from the config table and the clock (no redeploy when a start date passes). */
export type XpChipInfo = { kind: 'live'; amount: number } | { kind: 'soon'; startsOn: string } | null;

/** Reads the reward config (readable by every signed-in user; the server stays the only thing that pays). */
export async function getXpRules(): Promise<Record<string, XpRule>> {
  const { data, error } = await supabase.from('xp_rules').select('rule, amount, enabled, effective_from');
  if (error) throw new Error(error.message);
  const out: Record<string, XpRule> = {};
  for (const r of data ?? []) {
    out[r.rule as string] = { rule: r.rule as string, amount: r.amount as number, enabled: !!r.enabled, effectiveFrom: (r.effective_from as string | null) ?? null };
  }
  return out;
}

export function xpChipFor(rules: Record<string, XpRule> | null, rule: string, now = Date.now()): XpChipInfo {
  const r = rules?.[rule];
  if (!r || !r.enabled || r.amount <= 0) return null;
  if (r.effectiveFrom && now < new Date(r.effectiveFrom).getTime()) {
    const startsOn = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', month: 'short', day: 'numeric' }).format(new Date(r.effectiveFrom));
    return { kind: 'soon', startsOn };
  }
  return { kind: 'live', amount: r.amount };
}

/** Why an action paid less than expected, in words a player can use. Unknown codes show nothing. */
const REASON_MESSAGES: Record<string, string> = {
  daily_ceiling: "You've maxed out today. Come back tomorrow, your streak is safe.",
  halved: "You're past today's full XP, so this paid half.",
  already_awarded: 'You already earned XP for this today.',  not_todays_word: "XP is for today's word. This one was marked known, just no XP.",
  not_todays_fact: "XP is for today's facts. This one was from an earlier day, so no XP.",
  party_cap: "You've hit today's limit for party-game XP. Wins still count for bragging rights!",
  too_fast: 'That was a little too quick to count for XP. Take your time with the question.',
};

/** Per item type wording where the generic sentence would be vague. */
const FACT_MESSAGES: Record<string, string> = {
  already_awarded: 'Already earned for this fact.',
};
const WORD_MESSAGES: Record<string, string> = {
  already_awarded: "Already earned for today's word.",
};

/** `not_active` (a rule that hasn't started yet) and anything unknown show nothing at all. */
export function xpReasonMessage(reason?: string | null, itemType?: 'word' | 'fact'): string | null {
  if (!reason) return null;
  return (itemType === 'fact' && FACT_MESSAGES[reason]) || (itemType === 'word' && WORD_MESSAGES[reason]) || REASON_MESSAGES[reason] || null;
}

/** Milliseconds until the next 00:00 in Lagos (UTC+1, no daylight saving), when the day's limits start again. */
export function msUntilLagosMidnight(): number {
  const lagosNow = Date.now() + 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000 - (lagosNow % (24 * 60 * 60 * 1000)) + 500;
}

/** The Lagos calendar date, which is what the server uses for "today" (daily quests, the XP ceiling, the daily challenge). */
export function todayLagos(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
}

/** Tell the app an action earned XP (0 is fine: the reason is still shown). */
export function announceXp(detail: XpGainedDetail) {
  window.dispatchEvent(new CustomEvent<XpGainedDetail>(XP_GAINED_EVENT, { detail }));
}

/**
 * Asks the server to recompute today's quests, XP and badges from what the
 * user has actually done. The server is the only writer of XP, so the
 * client can't award itself anything (and it ignores any date sent from here).
 */
export async function syncXp(): Promise<XpSyncResult | null> {
  const { data, error } = await supabase.rpc('sync_xp');
  if (error) {
    console.warn('sync_xp failed', error.message);
    return null;
  }
  return data as XpSyncResult;
}

/** Tell the rest of the app XP may have changed, after syncing. */
export async function syncXpAndNotify(): Promise<XpSyncResult | null> {
  const result = await syncXp();
  window.dispatchEvent(new CustomEvent(XP_UPDATED_EVENT, { detail: result }));
  return result;
}

export async function getXpStatus(): Promise<XpStatus> {
  const { data, error } = await supabase.rpc('get_xp_status');
  if (error) throw new Error(error.message);
  const d = data as {
    total_xp: number; level: number; today: number; ceiling_full: number; ceiling_half: number;
    week_xp: number; min_weekly_xp: number; day: string;
  };
  return {
    totalXp: d.total_xp, level: d.level, today: d.today, ceilingFull: d.ceiling_full, ceilingHalf: d.ceiling_half,
    weekXp: d.week_xp, minWeeklyXp: d.min_weekly_xp, day: d.day,
  };
}

/** XP an XP-bearing streak milestone badge awards (see the `badges` table: streak badges pay 10). */
export const MILESTONE_XP = 10;

export async function getDailyQuests(): Promise<DailyQuests> {
  await syncXp();
  const { data, error } = await supabase
    .from('daily_quests')
    .select('key, xp, completed_at')
    .eq('quest_date', todayLagos())
    .order('key');
  if (error) throw error;
  // Only quests the app still knows (retired rows from earlier today stay in the database but are not shown).
  const quests = (data ?? []).filter((q) => (q.key as string) in QUEST_LABELS).map((q) => ({
    id: q.key as string,
    label: QUEST_LABELS[q.key as string] ?? (q.key as string),
    xp: q.xp as number,
    completed: !!q.completed_at,
  }));
  return { quests, completedCount: quests.filter((q) => q.completed).length };
}

/** One line of the XP a single action paid, read from the player's own ledger rows. */
export interface XpLine {
  label: string;
  amount: number;
}

/** Newest ledger timestamp (server clock), used as the "before" marker so the client clock never matters. */
export async function latestXpEventAt(): Promise<string | null> {
  const { data } = await supabase.from('xp_events').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data?.created_at as string | undefined) ?? null;
}

function lineLabel(source: string, refKey: string | null): string {
  if (source === 'quest') return `Quest: ${QUEST_LABELS[(refKey ?? '').split(':').pop() ?? ''] ?? 'daily quest'}`;
  switch (source) {
    case 'learn': return 'Word learned';
    case 'badge': return 'New badge';
    case 'streak': return 'Streak bonus';
    case 'review': return 'Review';
    case 'party': return 'Party game win';
    default: return 'XP';
  }
}

function groupLines(rows: { source: string; ref_key: string | null; amount: number }[]): XpLine[] {
  const lines = new Map<string, number>();
  for (const e of rows) {
    if (e.amount <= 0) continue;
    const label = lineLabel(e.source, e.ref_key);
    lines.set(label, (lines.get(label) ?? 0) + e.amount);
  }
  return [...lines].map(([label, amount]) => ({ label, amount }));
}

/** Everything the server paid after `since` (a value from latestXpEventAt), grouped into labelled lines. */
export async function xpLinesSince(since: string | null): Promise<XpLine[]> {
  let q = supabase.from('xp_events').select('source, ref_key, amount, created_at').order('created_at', { ascending: true });
  if (since) q = q.gt('created_at', since);
  const { data, error } = await q.limit(20);
  if (error || !data) return [];
  return groupLines(data as { source: string; ref_key: string | null; amount: number }[]);
}

/** Everything paid on the current Lagos day, grouped the same way, for the home screen. */
export async function xpLinesToday(): Promise<XpLine[]> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('source, ref_key, amount')
    .eq('lagos_day', todayLagos())
    .order('created_at', { ascending: true })
    .limit(100);
  if (error || !data) throw new Error(error?.message ?? 'Could not load XP');
  return groupLines(data as { source: string; ref_key: string | null; amount: number }[]);
}
