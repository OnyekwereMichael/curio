-- Weekly prize cycle: close the week, assign winners, notify, collect payout details, track payment.
--
--   weekly_cycles        one row per finalized week (snapshot of the rules used)
--   weekly_results       every ranked user's final rank/XP for that week (drives the results modals)
--   weekly_winners       the top 3 (extended): status pending -> submitted -> paid  (or expired / void)
--   winner_payouts       bank details, private: reachable only through the functions below
--   prize_notifications  outbox for push/email, processed by the send-prize-notifications edge function
--   admins               who may see payout details and mark prizes paid
--
-- Week = Monday 00:00 -> Monday 00:00 Africa/Lagos. A user's weekly total only counts from
-- greatest(week start, competition_start). Hidden users (hide_from_board) are not ranked.
-- Tie rule: equal XP -> whoever reached that total FIRST (their latest XP event in the week is earlier) wins;
-- a remaining exact tie falls back to user id so ranks are always unique.
-- Claim deadline: 7 days after the week is finalized.

-- ───────────────────────── admins ─────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- no policies: managed from the SQL editor / service role

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ───────────────────────── cycles & results ─────────────────────────
create table if not exists public.weekly_cycles (
  week_start timestamptz primary key,
  week_end timestamptz not null,
  status text not null default 'finalized' check (status in ('finalized')),
  finalized_at timestamptz not null default now(),
  participants int not null,
  winners int not null,
  min_weekly_xp int not null,
  currency text not null,
  prizes jsonb not null
);
alter table public.weekly_cycles enable row level security;
drop policy if exists "Authenticated read weekly cycles" on public.weekly_cycles;
create policy "Authenticated read weekly cycles" on public.weekly_cycles for select to authenticated using (true);
revoke insert, update, delete on public.weekly_cycles from anon, authenticated;

create table if not exists public.weekly_results (
  week_start timestamptz not null references public.weekly_cycles(week_start) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank int not null,
  xp int not null,
  reached_at timestamptz not null,       -- when they reached that total: the tie-break
  seen_at timestamptz,                   -- results modal dismissed
  primary key (week_start, user_id),
  unique (week_start, rank)
);
create index if not exists weekly_results_user_idx on public.weekly_results (user_id, week_start desc);
alter table public.weekly_results enable row level security;   -- read through get_my_results() only
revoke all on public.weekly_results from anon, authenticated;

-- ───────────────────────── winners: claim lifecycle ─────────────────────────
alter table public.weekly_winners drop constraint if exists weekly_winners_paid_status_check;
alter table public.weekly_winners add constraint weekly_winners_paid_status_check
  check (paid_status in ('pending', 'submitted', 'paid', 'expired', 'void'));
alter table public.weekly_winners
  add column if not exists claim_deadline timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists reached_at timestamptz,
  add column if not exists paid_by uuid references auth.users(id),
  add column if not exists payment_reference text,
  add column if not exists reminder_24h_at timestamptz,
  add column if not exists reminder_72h_at timestamptz;
create index if not exists weekly_winners_status_idx on public.weekly_winners (paid_status, claim_deadline);

-- Public winner list keeps working, but payout status/reference stay private.
revoke select on public.weekly_winners from anon, authenticated;
grant select (id, week_start, week_end, rank, user_id, xp, prize_amount, currency, created_at)
  on public.weekly_winners to authenticated;

create table if not exists public.winner_payouts (
  winner_id uuid primary key references public.weekly_winners(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text not null,
  updated_at timestamptz not null default now()
);
alter table public.winner_payouts enable row level security;   -- no policies
revoke all on public.winner_payouts from anon, authenticated;

-- ───────────────────────── notification outbox ─────────────────────────
create table if not exists public.prize_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start timestamptz not null,
  winner_id uuid references public.weekly_winners(id) on delete cascade,
  kind text not null check (kind in ('winner', 'results', 'reminder_24h', 'reminder_72h', 'expired', 'paid')),
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  last_error text,
  picked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start, kind)
);
create index if not exists prize_notifications_pending_idx on public.prize_notifications (status, created_at);
alter table public.prize_notifications enable row level security;
revoke all on public.prize_notifications from anon, authenticated;

-- ───────────────────────── helpers ─────────────────────────
create or replace function public._fmt_prize(p_amount int, p_currency text) returns text
language sql immutable as $$
  select case when p_currency = 'NGN' then '₦' else p_currency || ' ' end || to_char(p_amount, 'FM999,999,999')
$$;

create or replace function public._ordinal(p_rank int) returns text
language sql immutable as $$
  select case p_rank when 1 then '1st' when 2 then '2nd' when 3 then '3rd' else p_rank || 'th' end
$$;

create or replace function public._fmt_deadline(p_ts timestamptz) returns text
language sql immutable as $$
  select to_char(p_ts at time zone 'Africa/Lagos', 'FMDay, FMDD FMMon') || ' at ' || to_char(p_ts at time zone 'Africa/Lagos', 'FMHH12:MI AM')
$$;
revoke execute on function public._fmt_prize(int, text), public._ordinal(int), public._fmt_deadline(timestamptz) from public, anon, authenticated;

-- ───────────────────────── close a week ─────────────────────────
-- Finalizes every finished, not-yet-finalized week (so a missed run catches up), or one given week.
-- Idempotent: a finalized week is never touched again. Returns the number of weeks finalized.
create or replace function public.finalize_weekly_cycle(p_week_start timestamptz default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  cfg public.leaderboard_config%rowtype;
  v_cur timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_first timestamptz;
  w timestamptz;
  v_from timestamptz;
  v_end timestamptz;
  v_participants int;
  v_winners int;
  v_done int := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('finalize_weekly_cycle')) then return 0; end if;
  select * into cfg from public.leaderboard_config limit 1;
  v_first := date_trunc('week', cfg.competition_start at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';

  if p_week_start is not null and p_week_start + interval '7 days' > now() then
    raise exception 'That week has not finished yet';
  end if;

  for w in
    select gs from generate_series(coalesce(p_week_start, v_first), coalesce(p_week_start, v_cur - interval '7 days'), interval '7 days') gs
  loop
    continue when exists (select 1 from public.weekly_cycles where week_start = w);
    v_from := greatest(w, cfg.competition_start);
    v_end := w + interval '7 days';
    continue when v_end <= v_from;   -- week finished before the competition began

    insert into public.weekly_cycles (week_start, week_end, participants, winners, min_weekly_xp, currency, prizes)
    values (w, v_end, 0, 0, cfg.min_weekly_xp, cfg.currency, cfg.prizes);

    insert into public.weekly_results (week_start, user_id, rank, xp, reached_at)
    select w, t.user_id, row_number() over (order by t.xp desc, t.reached_at asc, t.user_id), t.xp, t.reached_at
    from (
      select x.user_id, sum(x.amount)::int as xp, max(x.created_at) as reached_at
      from public.xp_events x
      join public.users u on u.id = x.user_id
      left join public.user_preferences pr on pr.user_id = x.user_id
      where x.created_at >= v_from and x.created_at < v_end and not coalesce(pr.hide_from_board, false)
      group by x.user_id
      having sum(x.amount) > 0
    ) t;

    insert into public.weekly_winners (week_start, week_end, rank, user_id, xp, prize_amount, currency, claim_deadline, reached_at)
    select w, v_end, r.rank, r.user_id, r.xp, (pz.prize ->> 'amount')::int, cfg.currency, now() + interval '7 days', r.reached_at
    from public.weekly_results r
    join lateral (select pr.value as prize from jsonb_array_elements(cfg.prizes) pr where (pr.value ->> 'place')::int = r.rank) pz on true
    where r.week_start = w and r.rank <= 3 and r.xp >= cfg.min_weekly_xp
    on conflict do nothing;

    select count(*) into v_participants from public.weekly_results where week_start = w;
    select count(*) into v_winners from public.weekly_winners where week_start = w;
    update public.weekly_cycles set participants = v_participants, winners = v_winners where week_start = w;

    -- Winners: "you won, claim it". Everyone else who played: "results are in".
    insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
    select wn.user_id, w, wn.id, 'winner',
           'You finished ' || public._ordinal(wn.rank) || ' this week! 🏆',
           'You won ' || public._fmt_prize(wn.prize_amount, wn.currency) || '. Submit your payout details by '
             || public._fmt_deadline(wn.claim_deadline) || ' to claim it.'
    from public.weekly_winners wn where wn.week_start = w
    on conflict do nothing;

    insert into public.prize_notifications (user_id, week_start, kind, title, body)
    select r.user_id, w, 'results', 'This week''s results are in',
           'You finished #' || r.rank || ' with ' || r.xp || ' XP. See how close you were.'
    from public.weekly_results r
    where r.week_start = w and not exists (select 1 from public.weekly_winners wn where wn.week_start = w and wn.user_id = r.user_id)
    on conflict do nothing;

    v_done := v_done + 1;
  end loop;
  return v_done;
end $$;
revoke execute on function public.finalize_weekly_cycle(timestamptz) from public, anon, authenticated;

-- Kept for the SQL editor: records one week's winners (now through the full cycle close).
create or replace function public.record_weekly_winners(p_week_start timestamptz)
returns int language plpgsql security definer set search_path = public as $$
begin
  perform public.finalize_weekly_cycle(p_week_start);
  return (select count(*) from public.weekly_winners where week_start = p_week_start);
end $$;
revoke execute on function public.record_weekly_winners(timestamptz) from public, anon, authenticated;

-- ───────────────────────── reminders & expiry ─────────────────────────
create or replace function public.enqueue_prize_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare v_n int := 0; v_c int;
begin
  -- 24h and 72h after the win, only while the details are still missing and the window is open.
  with due as (
    update public.weekly_winners set reminder_24h_at = now()
    where paid_status = 'pending' and claim_deadline > now() and reminder_24h_at is null
      and now() >= created_at + interval '24 hours'
    returning id, user_id, week_start, prize_amount, currency, claim_deadline
  )
  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  select user_id, week_start, id, 'reminder_24h', 'Your prize is waiting',
         'You won ' || public._fmt_prize(prize_amount, currency) || '. Submit your payout details by ' || public._fmt_deadline(claim_deadline) || '.'
  from due on conflict do nothing;
  get diagnostics v_c = row_count; v_n := v_n + v_c;

  with due as (
    update public.weekly_winners set reminder_72h_at = now()
    where paid_status = 'pending' and claim_deadline > now() and reminder_72h_at is null
      and now() >= created_at + interval '72 hours'
    returning id, user_id, week_start, prize_amount, currency, claim_deadline
  )
  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  select user_id, week_start, id, 'reminder_72h', 'Last reminder: claim your prize',
         'Your ' || public._fmt_prize(prize_amount, currency) || ' prize expires ' || public._fmt_deadline(claim_deadline) || '. Submit your details now.'
  from due on conflict do nothing;
  get diagnostics v_c = row_count; v_n := v_n + v_c;

  -- Past the deadline with nothing submitted: the prize lapses.
  with ex as (
    update public.weekly_winners set paid_status = 'expired'
    where paid_status = 'pending' and claim_deadline <= now()
    returning id, user_id, week_start, prize_amount, currency
  )
  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  select user_id, week_start, id, 'expired', 'Prize claim window closed',
         'The deadline to claim your ' || public._fmt_prize(prize_amount, currency) || ' prize has passed. Keep climbing — there''s a new week to win.'
  from ex on conflict do nothing;
  get diagnostics v_c = row_count; v_n := v_n + v_c;
  return v_n;
end $$;
revoke execute on function public.enqueue_prize_reminders() from public, anon, authenticated;

create or replace function public.run_prize_cycle_tick() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.finalize_weekly_cycle();
  perform public.enqueue_prize_reminders();
end $$;
revoke execute on function public.run_prize_cycle_tick() from public, anon, authenticated;

-- Outbox claim for the edge function (service role only).
create or replace function public.claim_prize_notifications(p_limit int default 50)
returns setof public.prize_notifications language sql security definer set search_path = public as $$
  update public.prize_notifications n set status = 'sending', attempts = n.attempts + 1, picked_at = now()
  where n.id in (
    select id from public.prize_notifications
    where (status = 'pending' or (status = 'sending' and picked_at < now() - interval '10 minutes')) and attempts < 3
    order by created_at limit least(greatest(p_limit, 1), 200) for update skip locked
  )
  returning n.*;
$$;
revoke execute on function public.claim_prize_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_prize_notifications(int) to service_role;

-- ───────────────────────── what the signed-in user sees ─────────────────────────
create or replace function public.get_my_results() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_unseen jsonb; v_claims jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select jsonb_build_object(
      'week_start', r.week_start, 'week_end', c.week_end, 'rank', r.rank, 'xp', r.xp,
      'participants', c.participants, 'min_weekly_xp', c.min_weekly_xp, 'currency', c.currency,
      'third_xp', (select t.xp from public.weekly_results t where t.week_start = r.week_start and t.rank = 3),
      'winner', (select jsonb_build_object('id', wn.id, 'rank', wn.rank, 'prize_amount', wn.prize_amount,
                         'currency', wn.currency, 'status', wn.paid_status, 'claim_deadline', wn.claim_deadline)
                 from public.weekly_winners wn where wn.week_start = r.week_start and wn.user_id = uid))
    into v_unseen
  from public.weekly_results r join public.weekly_cycles c on c.week_start = r.week_start
  where r.user_id = uid and r.seen_at is null and c.finalized_at > now() - interval '21 days'
  -- A prize-winning week is always shown before a later non-winning one.
  order by exists (select 1 from public.weekly_winners x where x.week_start = r.week_start and x.user_id = uid) desc,
           r.week_start desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank, 'xp', wn.xp,
           'prize_amount', wn.prize_amount, 'currency', wn.currency, 'status', wn.paid_status,
           'claim_deadline', wn.claim_deadline, 'submitted_at', wn.submitted_at, 'paid_at', wn.paid_at,
           'bank_name', po.bank_name, 'account_last4', right(po.account_number, 4), 'account_name', po.account_name
         ) order by wn.week_start desc), '[]'::jsonb)
    into v_claims
  from public.weekly_winners wn
  left join public.winner_payouts po on po.winner_id = wn.id
  where wn.user_id = uid and wn.created_at > now() - interval '60 days'
    and wn.paid_status in ('pending', 'submitted', 'paid', 'expired');

  return jsonb_build_object('unseen', v_unseen, 'claims', v_claims);
end $$;

create or replace function public.mark_results_seen(p_week_start timestamptz) returns void
language sql security definer set search_path = public as $$
  update public.weekly_results set seen_at = now()
  where user_id = auth.uid() and week_start = p_week_start and seen_at is null
$$;

-- ───────────────────────── payout submission ─────────────────────────
create or replace function public.submit_payout_details(p_winner uuid, p_bank text, p_account_number text, p_account_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  wn public.weekly_winners%rowtype;
  v_bank text := btrim(coalesce(p_bank, ''));
  v_num text := regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g');
  v_name text := btrim(regexp_replace(coalesce(p_account_name, ''), '\s+', ' ', 'g'));
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into wn from public.weekly_winners where id = p_winner and user_id = uid for update;
  if not found then raise exception 'Prize not found'; end if;
  if wn.paid_status = 'paid' then raise exception 'This prize has already been paid'; end if;
  if wn.paid_status not in ('pending', 'submitted') then raise exception 'This prize can no longer be claimed'; end if;
  if wn.claim_deadline <= now() then raise exception 'The claim deadline has passed'; end if;
  if char_length(v_bank) < 2 or char_length(v_bank) > 80 then raise exception 'Choose your bank'; end if;
  if v_num !~ '^[0-9]{10}$' then raise exception 'Account number must be 10 digits'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 100 then raise exception 'Enter the account name'; end if;

  insert into public.winner_payouts (winner_id, user_id, bank_name, account_number, account_name)
  values (wn.id, uid, v_bank, v_num, v_name)
  on conflict (winner_id) do update
    set bank_name = excluded.bank_name, account_number = excluded.account_number,
        account_name = excluded.account_name, updated_at = now();

  update public.weekly_winners set paid_status = 'submitted', submitted_at = coalesce(submitted_at, now()) where id = wn.id;
  update public.weekly_results set seen_at = coalesce(seen_at, now()) where user_id = uid and week_start = wn.week_start;
  return jsonb_build_object('status', 'submitted', 'account_last4', right(v_num, 4));
end $$;

-- ───────────────────────── admin ─────────────────────────
create or replace function public.admin_list_winners(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank, 'xp', wn.xp,
      'prize_amount', wn.prize_amount, 'currency', wn.currency, 'status', wn.paid_status,
      'claim_deadline', wn.claim_deadline, 'submitted_at', wn.submitted_at, 'paid_at', wn.paid_at,
      'payment_reference', wn.payment_reference,
      'reminder_24h_at', wn.reminder_24h_at, 'reminder_72h_at', wn.reminder_72h_at,
      'name', u.full_name, 'email', u.email,
      'bank_name', po.bank_name, 'account_number', po.account_number, 'account_name', po.account_name
    ) order by wn.week_start desc, wn.rank)
    from public.weekly_winners wn
    join public.users u on u.id = wn.user_id
    left join public.winner_payouts po on po.winner_id = wn.id
    where p_status is null or wn.paid_status = p_status
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_mark_paid(p_winner uuid, p_reference text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare wn public.weekly_winners%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into wn from public.weekly_winners where id = p_winner for update;
  if not found then raise exception 'Winner not found'; end if;
  if wn.paid_status = 'paid' then raise exception 'Already marked as paid'; end if;
  if wn.paid_status <> 'submitted' then raise exception 'Payout details have not been submitted yet'; end if;

  update public.weekly_winners
    set paid_status = 'paid', paid_at = now(), paid_by = auth.uid(), payment_reference = nullif(btrim(coalesce(p_reference, '')), '')
    where id = wn.id;

  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  values (wn.user_id, wn.week_start, wn.id, 'paid', 'Your prize has been sent 🎉',
          public._fmt_prize(wn.prize_amount, wn.currency) || ' is on its way to your bank account.')
  on conflict do nothing;
  return jsonb_build_object('status', 'paid');
end $$;

revoke execute on function public.get_my_results() from public, anon;
revoke execute on function public.mark_results_seen(timestamptz) from public, anon;
revoke execute on function public.submit_payout_details(uuid, text, text, text) from public, anon;
revoke execute on function public.admin_list_winners(text) from public, anon;
revoke execute on function public.admin_mark_paid(uuid, text) from public, anon;
grant execute on function public.get_my_results() to authenticated;
grant execute on function public.mark_results_seen(timestamptz) to authenticated;
grant execute on function public.submit_payout_details(uuid, text, text, text) to authenticated;
grant execute on function public.admin_list_winners(text) to authenticated;
grant execute on function public.admin_mark_paid(uuid, text) to authenticated;

-- ───────────────────────── schedule ─────────────────────────
-- Every 10 minutes: close any finished week (idempotent, so a missed run catches up), queue reminders, expire lapsed claims.
select cron.schedule('prize-cycle-tick', '*/10 * * * *', $$select public.run_prize_cycle_tick()$$);
-- Every 5 minutes: send whatever is waiting in the outbox.
select cron.schedule('prize-notifications-dispatch', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://yetfoyuysgqksjwrelow.supabase.co/functions/v1/send-prize-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
$$);
