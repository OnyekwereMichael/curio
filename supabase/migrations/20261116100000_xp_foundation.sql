-- XP anti-farming, part 1: configuration, ledger hardening, rejections/meta tables, review columns.
-- Nothing here changes any user's XP. Existing ledger rows (including zeroed pre-reset ones) are left untouched;
-- the new 1..10 check is NOT VALID so it applies to new rows only.

-- ───────────────────────── configuration (tunable without a deploy) ─────────────────────────
create table if not exists public.xp_rules (
  rule text primary key,
  ledger_source text not null,          -- value stored in xp_events.source
  amount int not null check (amount between 0 and 10),   -- XP per award (or the maximum, when amount_from_ctx)
  amount_from_ctx boolean not null default false,        -- server-computed amount (streak band, badge), never above `amount`
  per text not null check (per in ('day', 'once')),      -- 'day' = once per Lagos day per item, 'once' = once ever per item
  counts_toward_ceiling boolean not null default true,
  needs_timing boolean not null default false,
  enabled boolean not null default true,
  description text not null
);

insert into public.xp_rules (rule, ledger_source, amount, amount_from_ctx, per, counts_toward_ceiling, needs_timing, description) values
  ('quest_learn_words', 'quest',     5,  false, 'day',  true,  false, 'Learn today''s word(s): once per day'),
  ('quest_quiz_score',  'quest',     10, false, 'day',  true,  false, 'Daily quiz: 4 of 5 or better, once per day'),
  ('quest_review_3',    'quest',     6,  false, 'day',  true,  false, 'Review: 3 correct saved words, once per day'),
  ('learn_word',        'learn',     6,  false, 'once', true,  true,  'Test me passed on a word in today''s plan: once per word'),
  ('challenge_correct', 'challenge', 2,  false, 'day',  true,  true,  'Daily challenge: per correct answer (5 questions = 10 max)'),
  ('streak_bonus',      'streak',    10, true,  'day',  true,  false, 'Daily streak bonus (amount by streak band, max 10)'),
  ('badge',             'badge',     10, true,  'once', false, false, 'Badge unlock (amount from badges.xp, max 10): once per badge')
on conflict (rule) do nothing;

create table if not exists public.xp_settings (
  key text primary key,
  value jsonb not null,
  description text
);

insert into public.xp_settings (key, value, description) values
  ('ceiling_full',            '85',   'Lagos-day XP paid in full up to this total (recurring sources only; badges are exempt)'),
  ('ceiling_half',            '128',  'Between ceiling_full and this total awards pay half (rounded down, min 1); above it they pay nothing'),
  ('min_answer_ms',           '1000', 'A challenge answer faster than this earns no XP'),
  ('min_session_ms',          '3000', 'A quiz session finished faster than this earns no XP'),
  ('require_question_token',  'false','Reject answers without a valid one-time question token. Turn on once the updated app is deployed.'),
  ('streak_bands',            '[[1,2],[3,4],[7,6],[14,8],[30,10]]', 'Daily streak bonus: [minimum streak days, XP]'),
  ('hash_retention_days',     '90',   'Device/IP hashes older than this are wiped'),
  ('flag_min_samples',        '10',   'Answers needed before the speed flag can fire'),
  ('flag_speed_median_ms_high',   '1200', 'Median answer time below this = high'),
  ('flag_speed_median_ms_medium', '2000', 'Median answer time below this = medium'),
  ('flag_accuracy',           '0.98', 'Accuracy at or above this counts as "unnatural" at volume'),
  ('flag_accuracy_min_answers','30',  'Answers needed before the accuracy flag can fire'),
  ('flag_accuracy_median_ms', '4000', 'Accuracy flag also needs a median answer time under this'),
  ('flag_rhythm_cv',          '0.15', 'Coefficient of variation of gaps below this = robotic rhythm'),
  ('flag_rhythm_min_answers', '20',   'Gaps needed before the rhythm flag can fire'),
  ('flag_break_gap_minutes',  '15',   'A pause at least this long counts as a break'),
  ('flag_nobreak_hours_medium','4',   'Unbroken activity this long = medium'),
  ('flag_nobreak_hours_high', '6',    'Unbroken activity this long = high'),
  ('flag_burst_share',        '0.8',  'Share of a day''s XP inside 15 minutes counted as a burst day'),
  ('flag_burst_days',         '5',    'Burst days in a week needed to flag'),
  ('flag_narrow_share',       '0.85', 'Share of weekly XP from one source'),
  ('flag_narrow_min_xp',      '100',  'Weekly XP needed before the narrow-content flag can fire'),
  ('flag_shared_ip_medium',   '3',    'Accounts sharing one network hash = medium'),
  ('flag_shared_ip_high',     '5',    'Accounts sharing one network hash = high'),
  ('flag_odd_share',          '0.6',  'Share of activity between 01:00 and 05:00 Lagos'),
  ('flag_odd_days',           '4',    'Days of odd-hours activity needed to flag'),
  ('flag_retention_min',      '0.4',  'Review accuracy below this on learned words = poor retention'),
  ('flag_retention_min_items','10',   'Review answers needed before the retention flag can fire'),
  ('risk_weight_low',         '1',    'Risk score weight'),
  ('risk_weight_medium',      '3',    'Risk score weight'),
  ('risk_weight_high',        '6',    'Risk score weight'),
  ('risk_suspicious_at',      '6',    'Risk score at or above this (or any high flag) reads "Suspicious"')
on conflict (key) do nothing;

-- private salt for device/IP hashes; no policies, never readable by clients
create table if not exists public.xp_secrets (key text primary key, value text not null);
insert into public.xp_secrets (key, value) values ('hash_salt', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- Weekly winner minimum: raised from 50 to 100 (config row, tunable). Prizes are never rolled down to lower ranks.
update public.leaderboard_config set min_weekly_xp = 100;

-- Test accounts: excluded from the board, prizes and analysis. Their XP is not touched.
create table if not exists public.xp_excluded_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
insert into public.xp_excluded_users (user_id, reason) values
  ('553ab222-5b5d-4654-ac3f-803d9a7f5287', 'Test account (confirmed by owner 2026-11-16)'),
  ('689def8f-a61c-4c4b-95d3-965bb385ce1c', 'Test account (confirmed by owner 2026-11-16)')
on conflict (user_id) do nothing;

-- ───────────────────────── badges: 0..10 XP, duel badges pay nothing ─────────────────────────
update public.badges set xp = case key
  when 'first-word' then 5   when 'words-10' then 5   when 'words-50' then 10
  when 'first-quiz' then 5   when 'perfect-quiz' then 5   when 'perfect-7' then 10
  when 'first-mastered' then 10   when 'mastered-10' then 10
  when 'streak-7' then 10   when 'streak-30' then 10   when 'streak-60' then 10   when 'streak-100' then 10
  when 'space-fan' then 5
  when 'first-duel' then 0   when 'duel-win' then 0
  else least(xp, 10) end;
do $$ begin
  alter table public.badges add constraint badges_xp_range check (xp between 0 and 10);
exception when duplicate_object then null; end $$;

-- ───────────────────────── ledger ─────────────────────────
alter table public.xp_events add column if not exists week_start timestamptz;
alter table public.xp_events add column if not exists lagos_day date;

-- Hard cap on every new award. NOT VALID = existing rows (zeroed pre-reset events, the old 25/60 XP awards) are left alone
-- until the correction phase is approved.
do $$ begin
  alter table public.xp_events add constraint xp_events_amount_1_10 check (amount between 1 and 10) not valid;
exception when duplicate_object then null; end $$;

create or replace function public._xp_events_fill() returns trigger language plpgsql set search_path = public as $$
begin
  new.lagos_day := (new.created_at at time zone 'Africa/Lagos')::date;
  new.week_start := date_trunc('week', new.created_at at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  return new;
end $$;
drop trigger if exists xp_events_fill on public.xp_events;
create trigger xp_events_fill before insert on public.xp_events for each row execute function public._xp_events_fill();

-- users.total_xp / level are a cache of the ledger: only this trigger writes them, so they can't drift.
create or replace function public._xp_events_total() returns trigger language plpgsql security definer set search_path = public as $$
declare v_uid uuid := coalesce(new.user_id, old.user_id); v_xp int; v_lvl int;
begin
  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = v_uid;
  v_lvl := floor((1 + sqrt(1 + 4.0 * v_xp / 25)) / 2)::int;
  perform set_config('app.xp_write', 'on', true);
  update public.users set total_xp = v_xp, level = v_lvl
    where id = v_uid and (total_xp is distinct from v_xp or level is distinct from v_lvl);
  perform set_config('app.xp_write', 'off', true);
  return null;
end $$;
drop trigger if exists xp_events_total on public.xp_events;
create trigger xp_events_total after insert or update of amount or delete on public.xp_events
  for each row execute function public._xp_events_total();

create table if not exists public.xp_event_meta (
  event_id uuid primary key references public.xp_events(id) on delete cascade,
  user_id uuid not null,
  source text not null,
  item_id text,
  session_id uuid,
  time_to_answer_ms int,
  is_correct boolean,
  device_hash text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists xp_event_meta_user_idx on public.xp_event_meta (user_id, created_at);
create index if not exists xp_event_meta_ip_idx on public.xp_event_meta (ip_hash) where ip_hash is not null;

create table if not exists public.xp_rejections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null,
  source_ref text,
  reason text not null,
  detail jsonb,
  attempted_at timestamptz not null default now()
);
create index if not exists xp_rejections_user_idx on public.xp_rejections (user_id, attempted_at desc);

-- ───────────────────────── one-time question tokens + server-side timing ─────────────────────────
alter table public.quiz_session_items add column if not exists token uuid not null default gen_random_uuid();
alter table public.quiz_session_items add column if not exists issued_at timestamptz not null default now();
alter table public.quiz_session_items add column if not exists time_ms int;
alter table public.daily_challenge_answers add column if not exists time_ms int;

create table if not exists public.daily_challenge_issues (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  idx int not null,
  token uuid not null default gen_random_uuid(),
  issued_at timestamptz not null default now(),
  primary key (user_id, challenge_date, idx),
  unique (token)
);

-- ───────────────────────── cheat flags, admin audit, winner review ─────────────────────────
create table if not exists public.user_flags (
  id uuid primary key default gen_random_uuid(),
  week_start timestamptz not null,
  user_id uuid not null,
  flag_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (week_start, user_id, flag_type)
);
create index if not exists user_flags_week_idx on public.user_flags (week_start, user_id);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target jsonb,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.weekly_winners add column if not exists review_status text not null default 'pending';
alter table public.weekly_winners add column if not exists reviewed_by uuid;
alter table public.weekly_winners add column if not exists reviewed_at timestamptz;
alter table public.weekly_winners add column if not exists review_notes text;
do $$ begin
  alter table public.weekly_winners add constraint weekly_winners_review_status_check
    check (review_status in ('pending', 'approved', 'rejected', 'disqualified'));
exception when duplicate_object then null; end $$;

create table if not exists public.winner_review_decisions (
  week_start timestamptz not null,
  user_id uuid not null,
  status text not null check (status in ('approved', 'rejected', 'disqualified')),
  notes text,
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now(),
  primary key (week_start, user_id)
);

create table if not exists public.winner_review_log (
  id uuid primary key default gen_random_uuid(),
  week_start timestamptz not null,
  snapshot jsonb not null,
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Payout is impossible without approval, enforced in the database whatever path writes it.
create or replace function public._weekly_winners_pay_gate() returns trigger language plpgsql set search_path = public as $$
begin
  if new.paid_status = 'paid' and new.review_status is distinct from 'approved' then
    raise exception 'This winner has not been approved yet. Review and approve them before marking as paid.';
  end if;
  return new;
end $$;
drop trigger if exists weekly_winners_pay_gate on public.weekly_winners;
create trigger weekly_winners_pay_gate before insert or update on public.weekly_winners
  for each row execute function public._weekly_winners_pay_gate();

-- ───────────────────────── RLS: server-only tables have no policies; clients cannot write XP anywhere ─────────────────────────
alter table public.xp_rules enable row level security;
alter table public.xp_settings enable row level security;
alter table public.xp_secrets enable row level security;
alter table public.xp_excluded_users enable row level security;
alter table public.xp_event_meta enable row level security;
alter table public.xp_rejections enable row level security;
alter table public.daily_challenge_issues enable row level security;
alter table public.user_flags enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.winner_review_decisions enable row level security;
alter table public.winner_review_log enable row level security;

do $$ begin
  create policy "Authenticated read xp rules" on public.xp_rules for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Defense in depth: strip write privileges (and TRUNCATE, which RLS cannot stop) from client roles on XP-related tables.
revoke insert, update, delete, truncate on
  public.xp_events, public.xp_rewards, public.xp_source_caps, public.xp_rules, public.xp_settings, public.xp_secrets,
  public.xp_excluded_users, public.xp_event_meta, public.xp_rejections, public.daily_challenge_issues, public.user_flags,
  public.admin_audit_log, public.winner_review_decisions, public.winner_review_log,
  public._xp_reset_backup_events, public._xp_reset_backup_users,
  public.daily_quests, public.user_badges, public.badges, public.quiz_sessions, public.quiz_session_items,
  public.daily_challenge_answers, public.daily_challenges, public.daily_challenge_keys,
  public.leaderboard_config, public.weekly_cycles, public.weekly_results, public.weekly_winners, public.winner_payouts
  from anon, authenticated;
revoke select on public.xp_secrets, public.xp_excluded_users, public.xp_event_meta, public.xp_rejections, public.daily_challenge_issues,
  public.user_flags, public.admin_audit_log, public.winner_review_decisions, public.winner_review_log,
  public.xp_settings, public.daily_challenge_keys, public.quiz_session_items from anon, authenticated;
revoke truncate on public.users from anon, authenticated;
