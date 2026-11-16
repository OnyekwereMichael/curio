-- XP anti-farming, part 3: boards, cheat flags, admin review + approval gate for prizes.

-- ───────────────────────── boards (test accounts out, totals from the ledger) ─────────────────────────
create or replace function public.get_leaderboard(p_period text default 'week', p_limit integer default 25, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.leaderboard_config%rowtype;
  v_week timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_from timestamptz; v_end timestamptz;
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_period not in ('week', 'all') then raise exception 'Invalid period'; end if;
  select * into cfg from public.leaderboard_config limit 1;

  v_from := case when now() < cfg.competition_start then v_week else greatest(v_week, cfg.competition_start) end;
  v_end := case when now() < cfg.competition_start then cfg.competition_start + interval '7 days' else v_week + interval '7 days' end;

  with scored as (
    select u.id,
           case
             when nullif(split_part(btrim(u.full_name), ' ', 2), '') is not null
               then split_part(btrim(u.full_name), ' ', 1) || ' ' || upper(left(split_part(btrim(u.full_name), ' ', 2), 1)) || '.'
             else coalesce(nullif(split_part(btrim(u.full_name), ' ', 1), ''), 'Learner')
           end as name,
           case when a.raw_user_meta_data ->> 'avatar_url' ~* '^https?://' then a.raw_user_meta_data ->> 'avatar_url' end as avatar_url,
           case when p_period = 'all' then coalesce(t.xp, 0) else coalesce(w.xp, 0) end as xp,
           case when p_period = 'all' then coalesce(t.last_at, 'infinity'::timestamptz) else coalesce(w.last_at, 'infinity'::timestamptz) end as tie_at
    from public.users u
    left join auth.users a on a.id = u.id
    left join public.user_preferences pr on pr.user_id = u.id
    left join (select user_id, sum(amount)::int as xp, max(created_at) as last_at
               from public.xp_events where created_at >= v_from group by user_id) w on w.user_id = u.id
    left join (select user_id, sum(amount)::int as xp, max(created_at) as last_at
               from public.xp_events group by user_id) t on t.user_id = u.id
    where not coalesce(pr.hide_from_board, false)
      and u.id not in (select user_id from public.xp_excluded_users)
  ),
  ranked as (
    select s.*,
           row_number() over (order by s.xp desc, s.tie_at asc, s.id) as rank,
           lag(s.xp) over (order by s.xp desc, s.tie_at asc, s.id) as prev_xp
    from scored s
  ),
  podium as (select min(xp) as third_xp from ranked where rank = 3)
  select jsonb_build_object(
    'period_start', v_from, 'period_end', v_end, 'competition_start', cfg.competition_start, 'min_weekly_xp', cfg.min_weekly_xp,
    'total', (select count(*) from ranked),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object('rank', r.rank, 'id', r.id, 'name', r.name, 'avatar_url', r.avatar_url, 'xp', r.xp, 'is_me', r.id = uid) order by r.rank)
      from (select * from ranked order by rank offset v_offset limit v_limit) r
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object('rank', r.rank, 'id', r.id, 'name', r.name, 'avatar_url', r.avatar_url, 'xp', r.xp, 'is_me', true,
        'xp_to_next', case when r.rank > 1 then r.prev_xp - r.xp + 1 end,
        'xp_to_podium', case when r.rank > 3 then pd.third_xp - r.xp + 1 end)
      from ranked r, podium pd where r.id = uid
    )
  ) into v_result;
  return v_result;
end $$;

-- friends board: the week is the Lagos week, like everywhere else (it used the UTC Monday: a one-hour mismatch)
create or replace function public.get_friends_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_week_start timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_today date := (now() at time zone 'utc')::date;
  v_board jsonb; v_count int; v_hidden boolean;
  v_buddy public.streak_buddies%rowtype; v_buddy_id uuid; v_buddy_name text;
  v_days int := 0; v_d date; v_done_today boolean := false; v_both boolean;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.weekly_xp desc, t.name), '[]'::jsonb) into v_board from (
    select u.id,
           coalesce(nullif(split_part(btrim(u.full_name), ' ', 1), ''), 'Learner') as name,
           coalesce((select sum(x.amount) from public.xp_events x where x.user_id = u.id and x.created_at >= v_week_start), 0)::int as weekly_xp,
           (u.id = uid) as is_me
    from public.users u
    where u.id = uid
       or (u.id in (select friend_id from public.friendships where user_id = uid)
           and not coalesce((select p.hide_from_board from public.user_preferences p where p.user_id = u.id), false))
  ) t;

  select count(*) into v_count from public.friendships where user_id = uid;
  select coalesce(hide_from_board, false) into v_hidden from public.user_preferences where user_id = uid;

  select * into v_buddy from public.streak_buddies where current and uid in (user_a, user_b) limit 1;
  if found then
    v_buddy_id := case when v_buddy.user_a = uid then v_buddy.user_b else v_buddy.user_a end;
    select coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'Your buddy') into v_buddy_name from public.users where id = v_buddy_id;
    v_done_today := (select count(distinct user_id) = 2 from public.user_activity_log
                     where user_id in (uid, v_buddy_id) and activity_date = v_today and quiz_completed);
    v_d := case when v_done_today then v_today else v_today - 1 end;
    while v_d >= v_buddy.started_on loop
      select count(distinct user_id) = 2 into v_both from public.user_activity_log
        where user_id in (uid, v_buddy_id) and activity_date = v_d and quiz_completed;
      exit when not v_both;
      v_days := v_days + 1;
      v_d := v_d - 1;
    end loop;
  end if;

  return jsonb_build_object(
    'leaderboard', v_board, 'friends_count', v_count, 'hidden', coalesce(v_hidden, false),
    'streak_buddy', case when v_buddy_id is null then null else
       jsonb_build_object('id', v_buddy_id, 'name', coalesce(v_buddy_name, 'Your buddy'), 'days_together', v_days, 'both_done_today', v_done_today) end
  );
end $$;

-- ───────────────────────── signals → flags ─────────────────────────
-- every answer given in a window, from quizzes and the daily challenge
create or replace function public._xp_answers(p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, ts timestamptz, ms int, correct boolean, src text)
language sql stable security definer set search_path = public as $$
  select s.user_id, i.answered_at, i.time_ms, i.is_correct, 'quiz'::text
  from public.quiz_session_items i join public.quiz_sessions s on s.id = i.session_id
  where i.answered_at >= p_from and i.answered_at < p_to
  union all
  select a.user_id, a.answered_at, a.time_ms, a.correct, 'challenge'::text
  from public.daily_challenge_answers a where a.answered_at >= p_from and a.answered_at < p_to
$$;

create or replace function public.compute_user_flags(p_week timestamptz default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  cfg public.leaderboard_config%rowtype;
  w timestamptz := coalesce(p_week, date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos');
  v_from timestamptz; v_to timestamptz; v_n int;
begin
  select * into cfg from public.leaderboard_config limit 1;
  v_from := greatest(w, cfg.competition_start);
  v_to := w + interval '7 days';
  delete from public.user_flags where week_start = w;

  -- 1. superhuman speed
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'superhuman_speed',
         case when t.med < public._xp_cfg('flag_speed_median_ms_high') then 'high' else 'medium' end,
         jsonb_build_object('median_ms', round(t.med), 'answers', t.n, 'answers_under_1s', t.fast)
  from (select user_id, count(*) n, percentile_cont(0.5) within group (order by ms) med, count(*) filter (where ms < 1000) fast
        from public._xp_answers(v_from, v_to) where ms is not null group by user_id) t
  where t.n >= public._xp_cfg('flag_min_samples') and t.med < public._xp_cfg('flag_speed_median_ms_medium');

  -- 2. unnatural accuracy at volume
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'unnatural_accuracy', case when t.acc >= 1 and t.n >= 60 then 'high' else 'medium' end,
         jsonb_build_object('accuracy', round(t.acc::numeric, 3), 'answers', t.n, 'median_ms', round(t.med))
  from (select user_id, count(*) n, avg(correct::int) acc, coalesce(percentile_cont(0.5) within group (order by ms), 0) med
        from public._xp_answers(v_from, v_to) group by user_id) t
  where t.n >= public._xp_cfg('flag_accuracy_min_answers') and t.acc >= public._xp_cfg('flag_accuracy')
    and t.med < public._xp_cfg('flag_accuracy_median_ms');

  -- 3. robotic rhythm (answers arriving at near-constant intervals)
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'robotic_rhythm', case when t.cv < public._xp_cfg('flag_rhythm_cv') / 2 then 'high' else 'medium' end,
         jsonb_build_object('gap_cv', round(t.cv::numeric, 3), 'mean_gap_s', round(t.mean_gap::numeric, 1), 'gaps', t.n)
  from (select user_id, count(*) n, avg(gap) mean_gap, stddev_samp(gap) / nullif(avg(gap), 0) cv
        from (select user_id, extract(epoch from ts - lag(ts) over (partition by user_id order by ts)) gap
              from public._xp_answers(v_from, v_to)) g
        where gap is not null and gap < 900 group by user_id) t
  where t.n >= public._xp_cfg('flag_rhythm_min_answers') and t.cv < public._xp_cfg('flag_rhythm_cv');

  -- 4. no breaks (one unbroken stretch of activity)
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'no_breaks',
         case when t.hrs >= public._xp_cfg('flag_nobreak_hours_high') then 'high' else 'medium' end,
         jsonb_build_object('longest_stretch_hours', round(t.hrs::numeric, 1), 'answers_in_stretch', t.n)
  from (select user_id, max(extract(epoch from mx - mn) / 3600) hrs, max(n) n
        from (select user_id, grp, min(ts) mn, max(ts) mx, count(*) n
              from (select user_id, ts,
                           sum(case when gap is null or gap >= public._xp_cfg('flag_break_gap_minutes') * 60 then 1 else 0 end)
                             over (partition by user_id order by ts) grp
                    from (select user_id, ts, extract(epoch from ts - lag(ts) over (partition by user_id order by ts)) gap
                          from public._xp_answers(v_from, v_to)) a) b
              group by user_id, grp) s
        group by user_id) t
  where t.hrs >= public._xp_cfg('flag_nobreak_hours_medium');

  -- 5. burst farming (most of a day's XP inside 15 minutes, on many days)
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'burst_farming', 'low', jsonb_build_object('burst_days', t.days)
  from (select user_id, count(*) days
        from (select user_id, lagos_day,
                     sum(amount) filter (where created_at <= first_at + interval '15 minutes')::numeric / nullif(sum(amount), 0) share,
                     sum(amount) total
              from (select user_id, lagos_day, amount, created_at, min(created_at) over (partition by user_id, lagos_day) first_at
                    from public.xp_events where created_at >= v_from and created_at < v_to and source <> 'badge') e
              group by user_id, lagos_day) d
        where d.total >= 20 and d.share >= public._xp_cfg('flag_burst_share') group by user_id) t
  where t.days >= public._xp_cfg('flag_burst_days');

  -- 6. narrow content (nearly all XP from one source)
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'narrow_content', 'low', jsonb_build_object('top_source', t.src, 'share', round(t.share::numeric, 2), 'week_xp', t.total)
  from (select distinct on (user_id) user_id, src, total, xp::numeric / total share
        from (select user_id, source src, sum(amount) xp, sum(sum(amount)) over (partition by user_id) total
              from public.xp_events where created_at >= v_from and created_at < v_to and source <> 'badge'
              group by user_id, source) s
        order by user_id, xp desc) t
  where t.total >= public._xp_cfg('flag_narrow_min_xp') and t.share >= public._xp_cfg('flag_narrow_share');

  -- 7. shared device / network across accounts (test accounts don't count)
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'shared_device',
         case when t.dev_others >= 3 or t.ip_accounts >= public._xp_cfg('flag_shared_ip_high') then 'high' else 'medium' end,
         jsonb_build_object('other_accounts_on_same_device', t.dev_others, 'accounts_on_same_network', t.ip_accounts)
  from (select m.user_id,
               (select count(distinct o.user_id) from public.xp_event_meta o
                 where o.device_hash = m.device_hash and o.user_id <> m.user_id and o.created_at >= v_from and o.created_at < v_to
                   and o.user_id not in (select user_id from public.xp_excluded_users)) as dev_others,
               (select count(distinct o.user_id) from public.xp_event_meta o
                 where o.ip_hash = m.ip_hash and o.created_at >= v_from and o.created_at < v_to
                   and o.user_id not in (select user_id from public.xp_excluded_users)) as ip_accounts
        from (select distinct user_id, device_hash, ip_hash from public.xp_event_meta
              where created_at >= v_from and created_at < v_to and user_id not in (select user_id from public.xp_excluded_users)) m) t
  where t.dev_others >= 1 or t.ip_accounts >= public._xp_cfg('flag_shared_ip_medium')
  on conflict (week_start, user_id, flag_type) do update
    set severity = case when excluded.severity = 'high' or public.user_flags.severity = 'high' then 'high' else 'medium' end,
        evidence = public.user_flags.evidence || excluded.evidence;

  -- 8. odd hours (01:00–05:00 Lagos on many days)
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'odd_hours', 'low', jsonb_build_object('odd_hour_days', t.days)
  from (select user_id, count(*) days
        from (select user_id, lagos_day, count(*) filter (where extract(hour from created_at at time zone 'Africa/Lagos') between 1 and 4) odd, count(*) total
              from public.xp_events where created_at >= v_from and created_at < v_to and source <> 'badge' group by user_id, lagos_day) d
        where d.odd >= 3 and d.odd::numeric / d.total >= public._xp_cfg('flag_odd_share') group by user_id) t
  where t.days >= public._xp_cfg('flag_odd_days');

  -- 9. poor retention (high XP, but misses most review questions on the words they "learned")
  insert into public.user_flags (week_start, user_id, flag_type, severity, evidence)
  select w, t.user_id, 'poor_retention', 'low', jsonb_build_object('review_accuracy', round(t.acc::numeric, 2), 'review_answers', t.n)
  from (select s.user_id, count(*) n, avg(i.is_correct::int) acc
        from public.quiz_session_items i join public.quiz_sessions s on s.id = i.session_id
        where s.kind = 'review' and i.answered_at >= v_from and i.answered_at < v_to group by s.user_id) t
  where t.n >= public._xp_cfg('flag_retention_min_items') and t.acc < public._xp_cfg('flag_retention_min')
    and (select coalesce(sum(amount), 0) from public.xp_events x where x.user_id = t.user_id and x.created_at >= v_from and x.created_at < v_to) >= cfg.min_weekly_xp;

  get diagnostics v_n = row_count;
  return (select count(*) from public.user_flags where week_start = w);
end $$;

create or replace function public.purge_xp_hashes() returns integer language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update public.xp_event_meta set device_hash = null, ip_hash = null
  where (device_hash is not null or ip_hash is not null)
    and created_at < now() - make_interval(days => public._xp_cfg('hash_retention_days')::int);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public._xp_answers(timestamptz, timestamptz), public.compute_user_flags(timestamptz), public.purge_xp_hashes() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('xp-flags-refresh', '*/30 * * * *', 'select public.compute_user_flags(null)');
    perform cron.schedule('xp-hash-retention', '17 3 * * *', 'select public.purge_xp_hashes()');
  end if;
end $$;

-- ───────────────────────── weekly finalisation: nothing is announced until the owner approves ─────────────────────────
create or replace function public.finalize_weekly_cycle(p_week_start timestamp with time zone default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  cfg public.leaderboard_config%rowtype;
  v_cur timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_first timestamptz; w timestamptz; v_from timestamptz; v_end timestamptz;
  v_participants int; v_winners int; v_done int := 0;
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
    continue when v_end <= v_from;

    insert into public.weekly_cycles (week_start, week_end, participants, winners, min_weekly_xp, currency, prizes)
    values (w, v_end, 0, 0, cfg.min_weekly_xp, cfg.currency, cfg.prizes);

    perform public.compute_user_flags(w);

    -- highest XP wins; a tie goes to whoever reached that score first. Test accounts and hidden users are not on the board.
    insert into public.weekly_results (week_start, user_id, rank, xp, reached_at)
    select w, t.user_id, row_number() over (order by t.xp desc, t.reached_at asc, t.user_id), t.xp, t.reached_at
    from (
      select x.user_id, sum(x.amount)::int as xp, max(x.created_at) as reached_at
      from public.xp_events x
      join public.users u on u.id = x.user_id
      left join public.user_preferences pr on pr.user_id = x.user_id
      where x.created_at >= v_from and x.created_at < v_end and not coalesce(pr.hide_from_board, false)
        and x.user_id not in (select user_id from public.xp_excluded_users)
      group by x.user_id
      having sum(x.amount) > 0
    ) t;

    -- the top 3 who reach the minimum are created as PENDING review: no announcement, no claim, no payment yet
    insert into public.weekly_winners (week_start, week_end, rank, user_id, xp, prize_amount, currency, claim_deadline, reached_at, review_status)
    select w, v_end, r.rank, r.user_id, r.xp, (pz.prize ->> 'amount')::int, cfg.currency, now() + interval '7 days', r.reached_at, 'pending'
    from public.weekly_results r
    join lateral (select pr.value as prize from jsonb_array_elements(cfg.prizes) pr where (pr.value ->> 'place')::int = r.rank) pz on true
    where r.week_start = w and r.rank <= 3 and r.xp >= cfg.min_weekly_xp
    on conflict do nothing;

    select count(*) into v_participants from public.weekly_results where week_start = w;
    select count(*) into v_winners from public.weekly_winners where week_start = w;
    update public.weekly_cycles set participants = v_participants, winners = v_winners where week_start = w;

    -- results notes go to everyone who is not a pending winner; winners are told only after approval
    insert into public.prize_notifications (user_id, week_start, kind, title, body)
    select r.user_id, w, 'results', 'This week''s results are in',
           'You finished #' || r.rank || ' with ' || r.xp || ' XP. See how close you were.'
    from public.weekly_results r
    where r.week_start = w and not exists (select 1 from public.weekly_winners wn where wn.week_start = w and wn.user_id = r.user_id)
    on conflict do nothing;

    insert into public.admin_audit_log (admin_id, action, target, detail)
    values ('00000000-0000-0000-0000-000000000000', 'week_finalized', jsonb_build_object('week_start', w),
            jsonb_build_object('winners_pending_review', v_winners, 'participants', v_participants));
    v_done := v_done + 1;
  end loop;
  return v_done;
end $$;

-- reminders and expiry only run for APPROVED winners
create or replace function public.enqueue_prize_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare v_n int := 0; v_c int;
begin
  with due as (
    update public.weekly_winners set reminder_24h_at = now()
    where review_status = 'approved' and paid_status = 'pending' and claim_deadline > now() and reminder_24h_at is null
      and now() >= reviewed_at + interval '24 hours'
    returning id, user_id, week_start, prize_amount, currency, claim_deadline
  )
  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  select user_id, week_start, id, 'reminder_24h', 'Your prize is waiting',
         'You won ' || public._fmt_prize(prize_amount, currency) || '. Submit your payout details by ' || public._fmt_deadline(claim_deadline) || '.'
  from due on conflict do nothing;
  get diagnostics v_c = row_count; v_n := v_n + v_c;

  with due as (
    update public.weekly_winners set reminder_72h_at = now()
    where review_status = 'approved' and paid_status = 'pending' and claim_deadline > now() and reminder_72h_at is null
      and now() >= reviewed_at + interval '72 hours'
    returning id, user_id, week_start, prize_amount, currency, claim_deadline
  )
  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  select user_id, week_start, id, 'reminder_72h', 'Last reminder: claim your prize',
         'Your ' || public._fmt_prize(prize_amount, currency) || ' prize expires ' || public._fmt_deadline(claim_deadline) || '. Submit your details now.'
  from due on conflict do nothing;
  get diagnostics v_c = row_count; v_n := v_n + v_c;

  with ex as (
    update public.weekly_winners set paid_status = 'expired'
    where review_status = 'approved' and paid_status = 'pending' and claim_deadline <= now()
    returning id, user_id, week_start, prize_amount, currency
  )
  insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
  select user_id, week_start, id, 'expired', 'Prize claim window closed',
         'The deadline to claim your ' || public._fmt_prize(prize_amount, currency) || ' prize has passed. Keep climbing — there''s a new week to win.'
  from ex on conflict do nothing;
  get diagnostics v_c = row_count; v_n := v_n + v_c;
  return v_n;
end $$;

-- a winner can only submit payout details once approved
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
  if wn.review_status <> 'approved' then raise exception 'This prize is still being reviewed'; end if;
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

-- players never learn they are a (pending) winner before approval
create or replace function public.get_my_results()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_unseen jsonb; v_claims jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select jsonb_build_object(
      'week_start', r.week_start, 'week_end', c.week_end, 'rank', r.rank, 'xp', r.xp,
      'participants', c.participants, 'min_weekly_xp', c.min_weekly_xp, 'currency', c.currency,
      'third_xp', (select t.xp from public.weekly_results t where t.week_start = r.week_start and t.rank = 3),
      'winner', (select jsonb_build_object('id', wn.id, 'rank', wn.rank, 'prize_amount', wn.prize_amount,
                         'currency', wn.currency, 'status', wn.paid_status, 'claim_deadline', wn.claim_deadline)
                 from public.weekly_winners wn where wn.week_start = r.week_start and wn.user_id = uid and wn.review_status = 'approved'))
    into v_unseen
  from public.weekly_results r join public.weekly_cycles c on c.week_start = r.week_start
  where r.user_id = uid and r.seen_at is null and c.finalized_at > now() - interval '21 days'
    and not exists (select 1 from public.weekly_winners p where p.week_start = r.week_start and p.user_id = uid and p.review_status = 'pending')
  order by exists (select 1 from public.weekly_winners x where x.week_start = r.week_start and x.user_id = uid and x.review_status = 'approved') desc,
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
  where wn.user_id = uid and wn.review_status = 'approved' and wn.created_at > now() - interval '60 days'
    and wn.paid_status in ('pending', 'submitted', 'paid', 'expired');

  return jsonb_build_object('unseen', v_unseen, 'claims', v_claims);
end $$;

create or replace function public.admin_list_winners(p_status text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank, 'xp', wn.xp,
      'prize_amount', wn.prize_amount, 'currency', wn.currency, 'status', wn.paid_status,
      'review_status', wn.review_status,
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

-- ───────────────────────── admin: review, decide, audit ─────────────────────────
create or replace function public._admin_audit(p_action text, p_target jsonb, p_detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (admin_id, action, target, detail) values (auth.uid(), p_action, p_target, p_detail)
$$;
revoke all on function public._admin_audit(text, jsonb, jsonb) from public, anon, authenticated;

create or replace function public._user_risk(p_week timestamptz, p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with f as (select flag_type, severity, evidence from public.user_flags where week_start = p_week and user_id = p_user),
  sc as (select coalesce(sum(public._xp_cfg('risk_weight_' || severity)), 0) score, bool_or(severity = 'high') any_high from f)
  select jsonb_build_object(
    'flags', coalesce((select jsonb_agg(jsonb_build_object('type', flag_type, 'severity', severity, 'evidence', evidence)
                        order by case severity when 'high' then 0 when 'medium' then 1 else 2 end) from f), '[]'::jsonb),
    'score', (select score from sc),
    'verdict', case when coalesce((select any_high from sc), false) or (select score from sc) >= public._xp_cfg('risk_suspicious_at')
                    then 'Suspicious' else 'Looks genuine' end)
$$;
revoke all on function public._user_risk(timestamptz, uuid) from public, anon, authenticated;

-- top 10 of a week with the evidence the owner needs to decide
create or replace function public.admin_week_review(p_week timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cfg public.leaderboard_config%rowtype;
  w timestamptz := coalesce(p_week, date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos');
  v_from timestamptz; v_to timestamptz;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into cfg from public.leaderboard_config limit 1;
  v_from := greatest(w, cfg.competition_start);
  v_to := w + interval '7 days';
  perform public.compute_user_flags(w);

  return jsonb_build_object(
    'week_start', w, 'week_end', v_to, 'min_weekly_xp', cfg.min_weekly_xp, 'finalized', exists (select 1 from public.weekly_cycles where week_start = w),
    'rows', coalesce((
      select jsonb_agg(rw order by (rw ->> 'rank')::int) from (
        select jsonb_build_object(
          'rank', t.rank, 'user_id', t.user_id, 'name', u.full_name, 'email', u.email, 'xp', t.xp, 'reached_at', t.reached_at,
          'sources', (select coalesce(jsonb_object_agg(source, xp), '{}'::jsonb)
                      from (select source, sum(amount) xp from public.xp_events where user_id = t.user_id and created_at >= v_from and created_at < v_to group by source) s),
          'winner', (select jsonb_build_object('id', wn.id, 'rank', wn.rank, 'prize_amount', wn.prize_amount, 'currency', wn.currency,
                                               'review_status', wn.review_status, 'paid_status', wn.paid_status, 'review_notes', wn.review_notes)
                     from public.weekly_winners wn where wn.week_start = w and wn.user_id = t.user_id),
          'risk', public._user_risk(w, t.user_id),
          'proof', jsonb_build_object(
            'words_learned', (select count(*) from public.xp_events where user_id = t.user_id and source = 'learn' and created_at >= v_from and created_at < v_to),
            'answers', (select count(*) from public._xp_answers(v_from, v_to) a where a.user_id = t.user_id),
            'accuracy', (select round(avg(correct::int)::numeric, 2) from public._xp_answers(v_from, v_to) a where a.user_id = t.user_id),
            'median_answer_ms', (select round(percentile_cont(0.5) within group (order by ms)) from public._xp_answers(v_from, v_to) a where a.user_id = t.user_id and ms is not null),
            'active_days', (select count(distinct lagos_day) from public.xp_events where user_id = t.user_id and created_at >= v_from and created_at < v_to),
            'review_answers', (select count(*) from public.quiz_session_items i join public.quiz_sessions s on s.id = i.session_id
                               where s.user_id = t.user_id and s.kind = 'review' and i.answered_at >= v_from and i.answered_at < v_to),
            'rejected_attempts', (select count(*) from public.xp_rejections r where r.user_id = t.user_id and r.attempted_at >= v_from and r.attempted_at < v_to)),
          'shared_with', (select coalesce(jsonb_agg(distinct jsonb_build_object('name', ou.full_name, 'email', ou.email)), '[]'::jsonb)
                          from public.xp_event_meta m
                          join public.xp_event_meta o on o.user_id <> m.user_id and o.created_at >= v_from and o.created_at < v_to
                               and (o.device_hash = m.device_hash or o.ip_hash = m.ip_hash)
                          join public.users ou on ou.id = o.user_id
                          where m.user_id = t.user_id and m.created_at >= v_from and m.created_at < v_to
                            and o.user_id not in (select user_id from public.xp_excluded_users))
        ) as rw
        from (select x.user_id, sum(x.amount)::int xp, max(x.created_at) reached_at,
                     row_number() over (order by sum(x.amount) desc, max(x.created_at) asc, x.user_id) rank
              from public.xp_events x
              left join public.user_preferences pr on pr.user_id = x.user_id
              where x.created_at >= v_from and x.created_at < v_to and not coalesce(pr.hide_from_board, false)
                and x.user_id not in (select user_id from public.xp_excluded_users)
              group by x.user_id having sum(x.amount) > 0) t
        join public.users u on u.id = t.user_id
        where t.rank <= 10
      ) q
    ), '[]'::jsonb));
end $$;

-- one player's week: timeline, XP per hour, rejections
create or replace function public.admin_user_detail(p_week timestamptz, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cfg public.leaderboard_config%rowtype;
  v_from timestamptz; v_to timestamptz;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into cfg from public.leaderboard_config limit 1;
  v_from := greatest(p_week, cfg.competition_start);
  v_to := p_week + interval '7 days';
  return jsonb_build_object(
    'timeline', coalesce((select jsonb_agg(jsonb_build_object('at', x.created_at, 'source', x.source, 'amount', x.amount, 'ref', x.ref_key,
                                                              'time_ms', m.time_to_answer_ms, 'correct', m.is_correct) order by x.created_at)
                          from public.xp_events x left join public.xp_event_meta m on m.event_id = x.id
                          where x.user_id = p_user and x.created_at >= v_from and x.created_at < v_to and x.amount > 0), '[]'::jsonb),
    'per_hour', coalesce((select jsonb_agg(jsonb_build_object('hour', h, 'xp', xp, 'events', n) order by h)
                          from (select date_trunc('hour', created_at at time zone 'Africa/Lagos') h, sum(amount) xp, count(*) n
                                from public.xp_events where user_id = p_user and created_at >= v_from and created_at < v_to and amount > 0 group by 1) z), '[]'::jsonb),
    'rejections', coalesce((select jsonb_agg(jsonb_build_object('at', attempted_at, 'source', source, 'ref', source_ref, 'reason', reason) order by attempted_at desc)
                            from (select * from public.xp_rejections where user_id = p_user and attempted_at >= v_from and attempted_at < v_to
                                  order by attempted_at desc limit 50) r), '[]'::jsonb),
    'risk', public._user_risk(p_week, p_user));
end $$;

-- the decision. Approving announces the win and starts the claim window; rejecting/disqualifying promotes the next eligible player.
create or replace function public.admin_review_winner(p_winner uuid, p_decision text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  wn public.weekly_winners%rowtype;
  v_next public.weekly_results%rowtype;
  v_min int; v_promoted uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_decision not in ('approved', 'rejected', 'disqualified') then raise exception 'Unknown decision'; end if;
  select * into wn from public.weekly_winners where id = p_winner for update;
  if not found then raise exception 'Winner not found'; end if;
  if wn.paid_status = 'paid' then raise exception 'This prize is already paid; it can no longer be changed'; end if;

  insert into public.winner_review_decisions (week_start, user_id, status, notes, reviewed_by)
  values (wn.week_start, wn.user_id, p_decision, p_notes, auth.uid())
  on conflict (week_start, user_id) do update set status = excluded.status, notes = excluded.notes, reviewed_by = excluded.reviewed_by, reviewed_at = now();
  perform public._admin_audit('winner_' || p_decision,
    jsonb_build_object('winner_id', wn.id, 'user_id', wn.user_id, 'week_start', wn.week_start, 'rank', wn.rank),
    jsonb_build_object('notes', p_notes, 'xp', wn.xp));

  if p_decision = 'approved' then
    update public.weekly_winners set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes,
           claim_deadline = now() + interval '7 days',
           paid_status = case when paid_status in ('void', 'expired') then 'pending' else paid_status end
     where id = wn.id;
    insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
    values (wn.user_id, wn.week_start, wn.id, 'winner', 'You finished ' || public._ordinal(wn.rank) || ' this week! 🏆',
            'You won ' || public._fmt_prize(wn.prize_amount, wn.currency) || '. Submit your payout details by '
              || public._fmt_deadline(now() + interval '7 days') || ' to claim it.')
    on conflict do nothing;
    return jsonb_build_object('status', 'approved');
  end if;

  -- rejected / disqualified: keep a full record, then hand the place to the next eligible player
  insert into public.winner_review_log (week_start, snapshot, reason, created_by)
  values (wn.week_start, to_jsonb(wn) || jsonb_build_object('payout', (select to_jsonb(po) from public.winner_payouts po where po.winner_id = wn.id)),
          p_decision || ': ' || coalesce(p_notes, ''), auth.uid());
  delete from public.winner_payouts where winner_id = wn.id;          -- belonged to the removed winner; kept in the log snapshot above
  update public.prize_notifications set status = 'skipped' where winner_id = wn.id and status = 'pending';
  insert into public.prize_notifications (user_id, week_start, kind, title, body)
  select wn.user_id, wn.week_start, 'results', 'This week''s results are in', 'Thanks for playing this week. See how the week went.'
  on conflict do nothing;

  select c.min_weekly_xp into v_min from public.weekly_cycles c where c.week_start = wn.week_start;
  select r.* into v_next from public.weekly_results r
   where r.week_start = wn.week_start and r.xp >= coalesce(v_min, 0)
     and r.user_id not in (select user_id from public.weekly_winners where week_start = wn.week_start)
     and r.user_id not in (select user_id from public.winner_review_decisions where week_start = wn.week_start and status in ('rejected', 'disqualified'))
     and r.user_id not in (select user_id from public.xp_excluded_users)
   order by r.rank limit 1;

  if found then
    v_promoted := v_next.user_id;
    update public.weekly_winners set user_id = v_next.user_id, xp = v_next.xp, reached_at = v_next.reached_at,
           review_status = 'pending', reviewed_by = null, reviewed_at = null, review_notes = null,
           paid_status = 'pending', submitted_at = null, paid_at = null, paid_by = null, payment_reference = null,
           reminder_24h_at = null, reminder_72h_at = null, claim_deadline = now() + interval '7 days'
     where id = wn.id;
    update public.prize_notifications set status = 'skipped'
     where user_id = v_promoted and week_start = wn.week_start and kind = 'results' and status = 'pending';
    perform public._admin_audit('winner_promoted', jsonb_build_object('winner_id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank),
                                jsonb_build_object('replaced', wn.user_id, 'promoted', v_promoted, 'xp', v_next.xp));
  else
    update public.weekly_winners set review_status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes, paid_status = 'void'
     where id = wn.id;
    perform public._admin_audit('winner_place_unfilled', jsonb_build_object('winner_id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank), null);
  end if;
  return jsonb_build_object('status', p_decision, 'promoted_user', v_promoted);
end $$;

create or replace function public.admin_audit_trail(p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('at', created_at, 'action', action, 'target', target, 'detail', detail) order by created_at desc)
                   from (select * from public.admin_audit_log order by created_at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) a), '[]'::jsonb);
end $$;

revoke all on function public.admin_week_review(timestamptz), public.admin_user_detail(timestamptz, uuid),
  public.admin_review_winner(uuid, text, text), public.admin_audit_trail(integer) from public, anon;
grant execute on function public.admin_week_review(timestamptz), public.admin_user_detail(timestamptz, uuid),
  public.admin_review_winner(uuid, text, text), public.admin_audit_trail(integer) to authenticated;
