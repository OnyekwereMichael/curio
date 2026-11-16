-- XP anti-farming, part 2: the single server-side award path.
-- Every XP source goes through public._award(). Amounts come from xp_rules (never from a client), the user comes from
-- the session, and every refusal is written to xp_rejections. The old award_xp() is disabled.

-- ───────────────────────── helpers ─────────────────────────
create or replace function public._xp_cfg(p_key text) returns numeric language sql stable security definer set search_path = public as $$
  select (value #>> '{}')::numeric from public.xp_settings where key = p_key
$$;
create or replace function public._xp_flag(p_key text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from public.xp_settings where key = p_key), false)
$$;
create or replace function public._lagos_today() returns date language sql stable as $$
  select (now() at time zone 'Africa/Lagos')::date
$$;
create or replace function public._xp_hash(p_value text) returns text language sql stable security definer set search_path = public as $$
  select case when nullif(p_value, '') is null then null
              else encode(sha256(convert_to((select value from public.xp_secrets where key = 'hash_salt') || p_value, 'UTF8')), 'hex') end
$$;
create or replace function public._streak_bonus(p_streak int) returns int language sql stable security definer set search_path = public as $$
  select coalesce(max((b ->> 1)::int), 0)
  from public.xp_settings s, jsonb_array_elements(s.value) b
  where s.key = 'streak_bands' and p_streak >= (b ->> 0)::int
$$;

create or replace function public._xp_reject(p_uid uuid, p_source text, p_ref text, p_reason text, p_detail jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into public.xp_rejections (user_id, source, source_ref, reason, detail) values (p_uid, p_source, p_ref, p_reason, p_detail);
  return jsonb_build_object('awarded', 0, 'reason', p_reason);
end $$;

-- XP earned on the current Lagos day by sources that count toward the daily ceiling (badges are exempt).
create or replace function public._xp_today(p_uid uuid) returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from public.xp_events
  where user_id = p_uid and lagos_day = public._lagos_today() and source <> 'badge'
$$;

-- ───────────────────────── the one award function ─────────────────────────
create or replace function public._award(p_uid uuid, p_rule text, p_ref text, p_ctx jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.xp_rules%rowtype;
  v_day date := public._lagos_today();
  v_amt int; v_paid int; v_used int; v_full int; v_half int; v_key text; v_id uuid;
  v_h jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
  if p_uid is null then raise exception 'No user'; end if;
  perform pg_advisory_xact_lock(hashtextextended('xp:' || p_uid::text, 0));   -- serialises parallel requests for one user

  select * into r from public.xp_rules where rule = p_rule;
  if not found or not r.enabled then
    return public._xp_reject(p_uid, coalesce(r.ledger_source, p_rule), p_ref, 'rule_disabled');
  end if;

  v_amt := case when r.amount_from_ctx then least(coalesce((p_ctx ->> 'amount')::int, 0), r.amount) else r.amount end;
  if v_amt <= 0 then return jsonb_build_object('awarded', 0, 'reason', 'no_xp'); end if;

  v_key := case r.per when 'day' then v_day::text || ':' || p_ref else p_ref end;
  if exists (select 1 from public.xp_events where user_id = p_uid and source = r.ledger_source and ref_key = v_key) then
    return public._xp_reject(p_uid, r.ledger_source, v_key, 'already_awarded');
  end if;

  v_paid := v_amt;
  if r.counts_toward_ceiling then
    v_full := public._xp_cfg('ceiling_full')::int;
    v_half := public._xp_cfg('ceiling_half')::int;
    v_used := public._xp_today(p_uid);
    if v_used >= v_half then
      return public._xp_reject(p_uid, r.ledger_source, v_key, 'daily_ceiling', jsonb_build_object('used', v_used));
    elsif v_used + v_amt > v_full then
      -- the part under the full band pays in full, the rest pays half (rounded down), at least 1, never past the half band
      v_paid := greatest(v_full - v_used, 0) + floor((v_amt - greatest(v_full - v_used, 0)) / 2.0)::int;
      v_paid := least(greatest(v_paid, 1), v_half - v_used);
    end if;
  end if;

  insert into public.xp_events (user_id, source, ref_key, amount) values (p_uid, r.ledger_source, v_key, v_paid)
  on conflict do nothing returning id into v_id;
  if v_id is null then return public._xp_reject(p_uid, r.ledger_source, v_key, 'already_awarded'); end if;

  insert into public.xp_event_meta (event_id, user_id, source, item_id, session_id, time_to_answer_ms, is_correct, device_hash, ip_hash)
  values (v_id, p_uid, r.ledger_source, nullif(p_ctx ->> 'item_id', ''), nullif(p_ctx ->> 'session_id', '')::uuid,
          nullif(p_ctx ->> 'time_ms', '')::int, nullif(p_ctx ->> 'is_correct', '')::boolean,
          public._xp_hash(v_h ->> 'x-device-id'),
          public._xp_hash(coalesce(v_h ->> 'cf-connecting-ip', split_part(coalesce(v_h ->> 'x-forwarded-for', ''), ',', 1))));

  return jsonb_build_object('awarded', v_paid, 'requested', v_amt, 'reason', case when v_paid < v_amt then 'halved' end);
end $$;

-- The legacy 4-argument path can no longer add XP.
create or replace function public.award_xp(p_user uuid, p_source text, p_ref text, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
begin
  raise exception 'award_xp is disabled: XP is only awarded by the server rules (_award)';
end $$;

revoke all on function public._xp_cfg(text), public._xp_flag(text), public._lagos_today(), public._xp_hash(text), public._streak_bonus(int),
  public._xp_reject(uuid, text, text, text, jsonb), public._xp_today(uuid), public._award(uuid, text, text, jsonb),
  public.award_xp(uuid, text, text, integer) from public, anon, authenticated;

-- ledger metadata for rows that existed before the new columns
-- (the 1..10 check is lifted for this metadata-only update: the zeroed pre-reset rows can't pass it. Amounts are untouched.)
alter table public.xp_events drop constraint if exists xp_events_amount_1_10;
update public.xp_events set
  lagos_day = (created_at at time zone 'Africa/Lagos')::date,
  week_start = date_trunc('week', created_at at time zone 'Africa/Lagos') at time zone 'Africa/Lagos'
where lagos_day is null or week_start is null;
alter table public.xp_events add constraint xp_events_amount_1_10 check (amount between 1 and 10) not valid;

-- ───────────────────────── quests, streak bonus and badges ─────────────────────────
create or replace function public._sync_xp_for(p_uid uuid, p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := p_uid;
  v_today date := public._lagos_today();                 -- quest and ceiling day (Lagos)
  v_utc date := (now() at time zone 'utc')::date;        -- the app's plan / quiz date
  v_plan public.daily_plans%rowtype;
  v_log public.user_activity_log%rowtype;
  v_known int; v_reviewed int; v_xp int; v_level int;
  v_new text[] := '{}';
  b record; qr record; cnt bigint; v_ins int; v_streak int;
  v_quiz_done boolean := false; v_res jsonb; v_reason text;
begin
  select * into v_plan from public.daily_plans where user_id = uid and plan_date = v_utc;
  select count(*) into v_known from public.user_word_progress p
    where p.user_id = uid and p.marked_known and p.word_id = any(coalesce(v_plan.word_ids, '{}'));
  select count(*) into v_reviewed from public.quiz_session_items i
    join public.quiz_sessions s on s.id = i.session_id
    where s.user_id = uid and s.kind = 'review' and s.quiz_date = v_utc and i.is_correct;
  select * into v_log from public.user_activity_log where user_id = uid and activity_date = v_utc limit 1;

  insert into public.daily_quests (user_id, quest_date, key, target, xp)
  select uid, v_today, k.key, k.target, (select amount from public.xp_rules where rule = 'quest_' || k.key)
  from (values ('learn_words', greatest(coalesce(cardinality(v_plan.word_ids), 0), 1)), ('quiz_score', 4), ('review_3', 3)) as k(key, target)
  on conflict do nothing;

  update public.daily_quests dq set
    xp = (select amount from public.xp_rules where rule = 'quest_' || dq.key),
    target = case dq.key when 'learn_words' then greatest(coalesce(cardinality(v_plan.word_ids), 0), 1) else dq.target end,
    progress = least(
      case dq.key
        when 'learn_words' then v_known
        when 'quiz_score' then case when coalesce(v_log.quiz_perfect, false) then 4 else coalesce(v_log.quiz_score, 0) end
        when 'review_3' then v_reviewed
        else dq.progress end,
      case dq.key when 'learn_words' then greatest(coalesce(cardinality(v_plan.word_ids), 0), 1) else dq.target end)
  where dq.user_id = uid and dq.quest_date = v_today and dq.completed_at is null;

  for qr in
    with done as (
      update public.daily_quests set completed_at = now()
      where user_id = uid and quest_date = v_today and completed_at is null and progress >= target
      returning key
    ) select key from done
  loop
    v_res := public._award(uid, 'quest_' || qr.key, qr.key);
    if v_res ->> 'reason' = 'daily_ceiling' then v_reason := 'daily_ceiling'; end if;
    if qr.key = 'quiz_score' then v_quiz_done := true; end if;
  end loop;

  -- streak bonus: once a day, on the day the daily quiz first reaches 4 of 5
  if v_quiz_done then
    with d as (
      select activity_date, activity_date - (row_number() over (order by activity_date))::int as grp
      from public.user_activity_log where user_id = uid and quiz_completed and (quiz_perfect or quiz_score >= 4)
    )
    select count(*) into v_streak from d where grp = (select grp from d where activity_date = v_utc);
    v_res := public._award(uid, 'streak_bonus', 'bonus', jsonb_build_object('amount', public._streak_bonus(coalesce(v_streak, 1))));
    if v_res ->> 'reason' = 'daily_ceiling' then v_reason := 'daily_ceiling'; end if;
  end if;

  for b in select * from public.badges where key not in (select badge_key from public.user_badges where user_id = uid) loop
    cnt := case b.kind
      when 'streak' then (
        select coalesce(max(run), 0) from (
          select count(*) as run from (
            select activity_date - (row_number() over (order by activity_date))::int as grp
            from public.user_activity_log
            where user_id = uid and quiz_completed and (quiz_perfect or quiz_score >= 4)
          ) d group by grp
        ) r)
      when 'words' then (select count(*) from public.user_word_progress where user_id = uid and marked_known)
      when 'quizzes' then (select count(*) from public.user_activity_log where user_id = uid and quiz_completed and (quiz_perfect or quiz_score >= 4))
      when 'perfect' then (select count(*) from public.user_activity_log where user_id = uid and quiz_perfect)
      when 'mastered' then (select count(*) from public.user_word_progress where user_id = uid and mastery = 'mastered')
      when 'duels' then (select count(*) from public.game_players p join public.game_rooms r on r.id = p.room_id
                         where p.user_id = uid and r.status = 'finished' and p.score >= 1)
      when 'duel_wins' then (select count(*) from public.game_players p join public.game_rooms r on r.id = p.room_id
                             where p.user_id = uid and r.status = 'finished'
                               and p.score > coalesce((select max(o.score) from public.game_players o where o.room_id = p.room_id and o.user_id <> uid), 0))
      when 'topic' then (select count(distinct i.fact_id) from public.quiz_session_items i
                         join public.quiz_sessions s on s.id = i.session_id
                         join public.facts f on f.id = i.fact_id
                         where s.user_id = uid and i.is_correct and f.topic = b.param)
      else 0 end;
    if cnt >= b.threshold then
      insert into public.user_badges (user_id, badge_key) values (uid, b.key) on conflict do nothing;
      get diagnostics v_ins = row_count;
      if v_ins > 0 then
        if b.xp > 0 then perform public._award(uid, 'badge', b.key, jsonb_build_object('amount', b.xp)); end if;
        v_new := array_append(v_new, b.key);
      end if;
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = uid;
  v_level := floor((1 + sqrt(1 + 4.0 * v_xp / 25)) / 2)::int;
  return jsonb_build_object('total_xp', v_xp, 'level', v_level, 'new_badges', to_jsonb(v_new),
                            'xp_today', public._xp_today(uid), 'reason', v_reason);
end $$;
revoke all on function public._sync_xp_for(uuid, date) from public, anon, authenticated;

-- The client date is ignored now: the server decides what "today" is.
create or replace function public.sync_xp(p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return public._sync_xp_for(auth.uid(), null);
end $$;

-- ───────────────────────── quizzes: tokens, timing, Test me payout ─────────────────────────
create or replace function public._quiz_payload(p_session uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'session_id', s.id,
    'kind', s.kind,
    'word_id', s.word_id,
    'answered', (select count(*) from public.quiz_session_items i where i.session_id = s.id and i.answer is not null),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('idx', i.idx, 'question', i.prompt, 'options', i.options, 'token', i.token) order by i.idx)
                           from public.quiz_session_items i where i.session_id = s.id), '[]'::jsonb))
  from public.quiz_sessions s where s.id = p_session;
$$;

create or replace function public._finish_session(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.quiz_sessions%rowtype;
  it public.quiz_session_items%rowtype;
  v_score int; v_total int; v_xp int := 0; v_passed boolean; v_step int; v_cur int; v_retry int := 0; v_before bigint;
  v_res jsonb; v_reason text; v_sync jsonb;
  steps int[] := array[1, 3, 8, 21, 45, 90];
begin
  select * into s from public.quiz_sessions where id = p_session;
  select coalesce(sum(amount), 0) into v_before from public.xp_events where user_id = s.user_id and source <> 'badge';
  select count(*) filter (where is_correct), count(*) into v_score, v_total from public.quiz_session_items where session_id = p_session;
  v_passed := v_total > 0 and v_score = v_total;

  update public.quiz_sessions set finished_at = now(), score = v_score, total = v_total, passed = v_passed where id = p_session;

  if s.kind = 'daily' then
    insert into public.user_activity_log (user_id, activity_date, quiz_completed, quiz_score, quiz_perfect)
      values (s.user_id, s.quiz_date, true, v_score, v_passed)
    on conflict (user_id, activity_date) do update
      set quiz_completed = true, quiz_score = excluded.quiz_score, quiz_perfect = excluded.quiz_perfect;

  elsif s.kind = 'learn' then
    if v_passed then
      perform set_config('app.learn_write', 'on', true);
      update public.user_word_progress set marked_known = true where user_id = s.user_id and word_id = s.word_id;
      perform set_config('app.learn_write', 'off', true);
      delete from public.word_check_cooldowns where user_id = s.user_id and word_id = s.word_id;

      -- XP only for a word in TODAY's plan, and only if the check wasn't completed impossibly fast
      if not exists (select 1 from public.daily_plans where user_id = s.user_id and plan_date = s.quiz_date and s.word_id = any(word_ids)) then
        v_res := public._xp_reject(s.user_id, 'learn', s.word_id::text, 'not_todays_word');
      elsif extract(epoch from (now() - s.created_at)) * 1000 < public._xp_cfg('min_session_ms') then
        v_res := public._xp_reject(s.user_id, 'learn', s.word_id::text, 'too_fast',
                                   jsonb_build_object('elapsed_ms', (extract(epoch from (now() - s.created_at)) * 1000)::int));
      else
        v_res := public._award(s.user_id, 'learn_word', s.word_id::text,
                  jsonb_build_object('item_id', s.word_id, 'session_id', s.id, 'is_correct', true,
                    'time_ms', (select sum(time_ms) from public.quiz_session_items where session_id = s.id)));
      end if;
      v_reason := v_res ->> 'reason';
    else
      v_retry := public._learn_cooldown_seconds();
      insert into public.word_check_cooldowns (user_id, word_id, retry_available_at, fail_count)
        values (s.user_id, s.word_id, now() + make_interval(secs => v_retry), 1)
      on conflict (user_id, word_id) do update
        set retry_available_at = excluded.retry_available_at,
            fail_count = public.word_check_cooldowns.fail_count + 1,
            updated_at = now();
      update public.quiz_sessions set finished_at = now(), passed = false
        where user_id = s.user_id and kind = 'learn' and word_id = s.word_id and finished_at is null and id <> s.id;
    end if;

  else
    -- review: scheduling only. Per-card review XP is 0; the daily review quest pays instead.
    perform set_config('app.learn_write', 'on', true);
    for it in select * from public.quiz_session_items where session_id = p_session order by idx loop
      select interval_step into v_cur from public.user_word_progress where user_id = s.user_id and word_id = it.word_id;
      v_step := case when it.is_correct then least(coalesce(v_cur, 0) + 2, 5) else 0 end;
      update public.user_word_progress set
        interval_step = v_step,
        mastery = case when v_step >= 4 then 'mastered' else 'learning' end,
        due_at = now() + make_interval(days => steps[v_step + 1]),
        review_count = review_count + 1,
        last_reviewed_at = now()
      where user_id = s.user_id and word_id = it.word_id;
    end loop;
    perform set_config('app.learn_write', 'off', true);
  end if;

  v_sync := public._sync_xp_for(s.user_id, s.quiz_date);
  v_reason := coalesce(v_reason, v_sync ->> 'reason');
  select coalesce(sum(amount), 0) - v_before into v_xp from public.xp_events where user_id = s.user_id and source <> 'badge';

  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'xp', v_xp, 'retry_seconds', v_retry,
                            'xp_today', public._xp_today(s.user_id), 'reason', v_reason);
end $$;
revoke all on function public._finish_session(uuid) from public, anon, authenticated;

create or replace function public._answer_quiz(p_session uuid, p_idx integer, p_answer text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.quiz_sessions%rowtype; it public.quiz_session_items%rowtype;
  v_answered int; v_total int; v_prev timestamptz; v_correct boolean; v_result jsonb; v_ms int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into s from public.quiz_sessions where id = p_session and user_id = uid for update;
  if not found then raise exception 'Quiz not found'; end if;
  if s.finished_at is not null then raise exception 'Quiz already finished'; end if;
  if s.expires_at <= now() then raise exception 'Quiz expired'; end if;

  select count(*) filter (where answer is not null), count(*), max(answered_at)
    into v_answered, v_total, v_prev from public.quiz_session_items where session_id = s.id;
  if p_idx <> v_answered then
    return public._xp_reject(uid, 'quiz', s.id::text || ':' || p_idx, 'replay_or_out_of_order') || jsonb_build_object('rejected', true);
  end if;
  if now() - coalesce(v_prev, s.created_at) < interval '2 seconds' then raise exception 'too_fast'; end if;

  select * into it from public.quiz_session_items where session_id = s.id and idx = p_idx;
  if p_token is distinct from it.token and (p_token is not null or public._xp_flag('require_question_token')) then
    return public._xp_reject(uid, 'quiz', s.id::text || ':' || p_idx, 'bad_token') || jsonb_build_object('rejected', true);
  end if;
  if not (it.options ? p_answer) then raise exception 'Not one of the options'; end if;

  v_correct := (p_answer = it.correct);
  v_ms := (extract(epoch from (now() - coalesce(v_prev, s.created_at))) * 1000)::int;
  update public.quiz_session_items set answer = p_answer, is_correct = v_correct, answered_at = now(), time_ms = v_ms
    where session_id = s.id and idx = p_idx;

  if v_answered + 1 >= v_total then v_result := public._finish_session(s.id); end if;

  return jsonb_build_object('correct', v_correct, 'correct_answer', it.correct, 'done', v_answered + 1 >= v_total, 'result', v_result);
end $$;
revoke all on function public._answer_quiz(uuid, integer, text, uuid) from public, anon, authenticated;

-- old 3-argument entry point (clients without a token) and the new 4-argument one
create or replace function public.answer_quiz(p_session uuid, p_idx integer, p_answer text)
returns jsonb language sql security definer set search_path = public as $$
  select public._answer_quiz(p_session, p_idx, p_answer, null)
$$;
create or replace function public.answer_quiz(p_session uuid, p_idx integer, p_answer text, p_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  select public._answer_quiz(p_session, p_idx, p_answer, p_token)
$$;
grant execute on function public.answer_quiz(uuid, integer, text), public.answer_quiz(uuid, integer, text, uuid) to authenticated;

-- ───────────────────────── daily challenge: Lagos day, tokens, 2 XP per correct answer ─────────────────────────
create or replace function public.get_daily_challenge()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_date date := public._lagos_today();
  c public.daily_challenges%rowtype;
  v_answered int; v_score int; v_token uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform public._ensure_daily_challenge(v_date);
  select * into c from public.daily_challenges where challenge_date = v_date;
  select count(*), count(*) filter (where correct) into v_answered, v_score
    from public.daily_challenge_answers where user_id = uid and challenge_date = v_date;
  if v_answered < jsonb_array_length(c.prompts) then
    insert into public.daily_challenge_issues (user_id, challenge_date, idx) values (uid, v_date, v_answered) on conflict do nothing;
    select token into v_token from public.daily_challenge_issues where user_id = uid and challenge_date = v_date and idx = v_answered;
  end if;
  return jsonb_build_object(
    'date', v_date,
    'number', c.number,
    'total', jsonb_array_length(c.prompts),
    'questions', (select coalesce(jsonb_agg(jsonb_build_object('index', t.i - 1, 'question', t.q->>'question', 'options', t.q->'options') order by t.i), '[]'::jsonb)
                  from jsonb_array_elements(c.prompts) with ordinality as t(q, i)),
    'answers', (select coalesce(jsonb_agg(jsonb_build_object('index', a.idx, 'answer', a.answer, 'correct', a.correct, 'correct_answer', k.correct) order by a.idx), '[]'::jsonb)
                from public.daily_challenge_answers a
                join public.daily_challenge_keys k on k.challenge_date = a.challenge_date and k.idx = a.idx
                where a.user_id = uid and a.challenge_date = v_date),
    'answered', v_answered,
    'score', v_score,
    'completed', v_answered >= jsonb_array_length(c.prompts),
    'streak', public._challenge_streak(uid, v_date),
    'token', v_token
  );
end $$;

create or replace function public._submit_challenge(p_index integer, p_answer text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_date date := public._lagos_today();
  v_total int; v_answered int; v_key text; v_correct boolean; v_score int; v_done boolean;
  v_issue public.daily_challenge_issues%rowtype; v_has boolean; v_prev timestamptz; v_ms int;
  v_award jsonb := jsonb_build_object('awarded', 0);
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(hashtextextended('challenge:' || uid::text, 0));
  perform public._ensure_daily_challenge(v_date);
  select jsonb_array_length(prompts) into v_total from public.daily_challenges where challenge_date = v_date;
  select count(*), max(answered_at) into v_answered, v_prev from public.daily_challenge_answers where user_id = uid and challenge_date = v_date;

  if v_answered >= v_total then
    return public._xp_reject(uid, 'challenge', v_date::text || ':' || p_index, 'already_finished') || jsonb_build_object('rejected', true);
  end if;
  if p_index <> v_answered then
    return public._xp_reject(uid, 'challenge', v_date::text || ':' || p_index, 'replay_or_out_of_order') || jsonb_build_object('rejected', true);
  end if;

  select * into v_issue from public.daily_challenge_issues where user_id = uid and challenge_date = v_date and idx = p_index;
  v_has := found;
  if (p_token is not null or public._xp_flag('require_question_token')) and (not v_has or v_issue.token is distinct from p_token) then
    return public._xp_reject(uid, 'challenge', v_date::text || ':' || p_index, 'bad_token') || jsonb_build_object('rejected', true);
  end if;

  -- the server measures how long the question was on screen: from the later of "question issued" and "previous answer"
  v_ms := case when v_has then (extract(epoch from (now() - greatest(v_issue.issued_at, coalesce(v_prev, v_issue.issued_at)))) * 1000)::int
               when v_prev is not null then (extract(epoch from (now() - v_prev)) * 1000)::int end;

  select correct into v_key from public.daily_challenge_keys where challenge_date = v_date and idx = p_index;
  v_correct := (p_answer = v_key);
  insert into public.daily_challenge_answers (user_id, challenge_date, idx, answer, correct, answered_at, time_ms)
    values (uid, v_date, p_index, p_answer, v_correct, now(), v_ms);
  v_done := (v_answered + 1) >= v_total;
  select count(*) filter (where correct) into v_score from public.daily_challenge_answers where user_id = uid and challenge_date = v_date;

  if v_correct then
    if v_ms is not null and v_ms < public._xp_cfg('min_answer_ms') then
      v_award := public._xp_reject(uid, 'challenge', v_date::text || ':' || p_index, 'too_fast', jsonb_build_object('time_ms', v_ms));
    else
      v_award := public._award(uid, 'challenge_correct', p_index::text,
                  jsonb_build_object('item_id', v_date::text || ':' || p_index, 'is_correct', true, 'time_ms', v_ms));
    end if;
  end if;

  return jsonb_build_object('correct', v_correct, 'correct_answer', v_key, 'completed', v_done, 'score', v_score,
                            'streak', case when v_done then public._challenge_streak(uid, v_date) else null end,
                            'xp', coalesce((v_award ->> 'awarded')::int, 0), 'reason', v_award ->> 'reason',
                            'xp_today', public._xp_today(uid));
end $$;
revoke all on function public._submit_challenge(integer, text, uuid) from public, anon, authenticated;

create or replace function public.submit_challenge_answer(p_index integer, p_answer text)
returns jsonb language sql security definer set search_path = public as $$
  select public._submit_challenge(p_index, p_answer, null)
$$;
create or replace function public.submit_challenge_answer(p_index integer, p_answer text, p_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  select public._submit_challenge(p_index, p_answer, p_token)
$$;
grant execute on function public.submit_challenge_answer(integer, text), public.submit_challenge_answer(integer, text, uuid) to authenticated;

-- ───────────────────────── one place every XP display reads ─────────────────────────
create or replace function public.get_xp_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.leaderboard_config%rowtype;
  v_week timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_total int; v_week_xp int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into cfg from public.leaderboard_config limit 1;
  select coalesce(sum(amount), 0)::int into v_total from public.xp_events where user_id = uid;
  select coalesce(sum(amount), 0)::int into v_week_xp from public.xp_events
    where user_id = uid and created_at >= greatest(v_week, cfg.competition_start);
  return jsonb_build_object(
    'total_xp', v_total,
    'level', floor((1 + sqrt(1 + 4.0 * v_total / 25)) / 2)::int,
    'today', public._xp_today(uid),
    'ceiling_full', public._xp_cfg('ceiling_full')::int,
    'ceiling_half', public._xp_cfg('ceiling_half')::int,
    'week_xp', v_week_xp,
    'min_weekly_xp', cfg.min_weekly_xp,
    'day', public._lagos_today());
end $$;
grant execute on function public.get_xp_status() to authenticated;
