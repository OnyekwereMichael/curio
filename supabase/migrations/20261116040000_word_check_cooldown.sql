-- Failed "I know this" checks: a per-user, per-word cooldown enforced by the server.
--
-- Root cause of the bypass: start_quiz resumed any unfinished session BEFORE it looked at the cooldown,
-- and the check modal fires start_quiz twice (React StrictMode / double effect), which created a
-- second, never-finished session. Failing one left the other open, so "Test me" resumed it.
-- Fixes: serialise starts per (user, kind, word), check the cooldown before resuming, close sibling
-- sessions on a failed check, and keep the cooldown in its own table (retry_available_at, server clock).

create table if not exists public.word_check_cooldowns (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  retry_available_at timestamptz not null,
  fail_count int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);
alter table public.word_check_cooldowns enable row level security;  -- no policies: read via get_word_cooldowns()

create or replace function public._learn_cooldown_seconds() returns int
language sql immutable as $$ select 180 $$;   -- 3 minutes, fixed
revoke execute on function public._learn_cooldown_seconds() from public, anon, authenticated;

-- Seconds left per word, from the server clock. Clients count down from this, never from their own date.
create or replace function public.get_word_cooldowns(p_word_ids uuid[] default null)
returns table (word_id uuid, seconds_remaining int)
language sql stable security definer set search_path = public as $$
  select c.word_id, ceil(extract(epoch from (c.retry_available_at - now())))::int
  from public.word_check_cooldowns c
  where c.user_id = auth.uid() and c.retry_available_at > now()
    and (p_word_ids is null or c.word_id = any(p_word_ids));
$$;
revoke execute on function public.get_word_cooldowns(uuid[]) from public, anon;
grant execute on function public.get_word_cooldowns(uuid[]) to authenticated;

create or replace function public.start_quiz(p_kind text, p_word_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  s public.quiz_sessions%rowtype;
  v_plan public.daily_plans%rowtype;
  v_idx int := 0;
  v_wid uuid;
  v_fid uuid;
  v_wait int;
  i int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('daily', 'learn', 'review') then raise exception 'Bad quiz kind'; end if;

  -- Pick up where they left off rather than rolling a fresh set of questions.
  -- One start per (user, kind, word) at a time: a double-fired request waits here and then resumes
  -- the first one's session instead of creating a second, orphaned one.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_kind || ':' || coalesce(p_word_id::text, ''), 0));

  -- The cooldown is checked before anything can be resumed, so no leftover session can get around it.
  if p_kind = 'learn' and p_word_id is not null then
    select ceil(extract(epoch from (retry_available_at - now())))::int into v_wait
      from public.word_check_cooldowns where user_id = uid and word_id = p_word_id;
    if coalesce(v_wait, 0) > 0 then raise exception 'cooldown:%', v_wait; end if;
  end if;

  select * into s from public.quiz_sessions
    where user_id = uid and kind = p_kind and finished_at is null and expires_at > now()
      and quiz_date = v_today and (p_kind <> 'learn' or word_id = p_word_id)
    order by created_at desc limit 1;
  if found then return public._quiz_payload(s.id); end if;

  if p_kind = 'daily' then
    if exists (select 1 from public.user_activity_log where user_id = uid and activity_date = v_today and quiz_completed) then
      raise exception 'Already done today';
    end if;
    if (select count(*) from public.quiz_sessions where user_id = uid and kind = 'daily' and quiz_date = v_today) >= 2 then
      raise exception 'Daily quiz attempts used up';
    end if;
  elsif p_kind = 'learn' then
    if p_word_id is null then raise exception 'Missing word'; end if;
    if not exists (select 1 from public.daily_plans where user_id = uid and p_word_id = any(word_ids)) then
      raise exception 'That word is not in your plan';
    end if;
    if exists (select 1 from public.user_word_progress where user_id = uid and word_id = p_word_id and marked_known) then
      raise exception 'Already learned';
    end if;
  end if;

  insert into public.quiz_sessions (user_id, kind, quiz_date, word_id, expires_at)
  values (uid, p_kind, v_today, case when p_kind = 'learn' then p_word_id end,
          now() + case p_kind when 'daily' then interval '3 hours' else interval '1 hour' end)
  returning * into s;

  if p_kind = 'daily' then
    perform public.get_or_build_daily_plan(v_today);
    select * into v_plan from public.daily_plans where user_id = uid and plan_date = v_today;

    -- Always five questions: 2 plan words, 1 older word (cloze), 2 facts; topped up if a pool runs short.
    foreach v_wid in array coalesce(v_plan.word_ids, '{}') loop
      exit when v_idx >= 2;
      if public._add_word_item(s.id, v_idx, v_wid, 'meaning') then v_idx := v_idx + 1; end if;
    end loop;

    select p.word_id into v_wid from public.user_word_progress p
      where p.user_id = uid and not (p.word_id = any(coalesce(v_plan.word_ids, '{}')))
        and exists (select 1 from public.daily_plans d where d.user_id = uid and p.word_id = any(d.word_ids))
      order by random() limit 1;
    if v_wid is not null and public._add_word_item(s.id, v_idx, v_wid, 'cloze') then v_idx := v_idx + 1; end if;

    if v_plan.fact_id is not null and v_idx < 5 then
      if public._add_fact_item(s.id, v_idx, v_plan.fact_id, 0) then v_idx := v_idx + 1; end if;
    end if;
    select p.fact_id into v_fid from public.user_fact_progress p
      where p.user_id = uid and p.fact_id is distinct from v_plan.fact_id order by random() limit 1;
    if v_fid is not null and v_idx < 5 then
      if public._add_fact_item(s.id, v_idx, v_fid, 0) then v_idx := v_idx + 1; end if;
    end if;

    -- Top up to five: the plan fact's other questions, then any further plan words.
    if v_plan.fact_id is not null then
      for i in 1..3 loop
        exit when v_idx >= 5;
        if public._add_fact_item(s.id, v_idx, v_plan.fact_id, i) then v_idx := v_idx + 1; end if;
      end loop;
    end if;
    foreach v_wid in array coalesce(v_plan.word_ids, '{}') loop
      exit when v_idx >= 5;
      if not exists (select 1 from public.quiz_session_items where session_id = s.id and word_id = v_wid) then
        if public._add_word_item(s.id, v_idx, v_wid, 'meaning') then v_idx := v_idx + 1; end if;
      end if;
    end loop;

    -- Last resort (few plan words, facts without questions): other facts, then any words, until five.
    if v_idx < 5 then
      for v_fid in
        select p.fact_id from public.user_fact_progress p join public.facts f on f.id = p.fact_id
        where p.user_id = uid and jsonb_array_length(coalesce(f.quiz_questions, '[]'::jsonb)) > 0
          and not exists (select 1 from public.quiz_session_items x where x.session_id = s.id and x.fact_id = p.fact_id)
        order by random() limit 5
      loop
        exit when v_idx >= 5;
        if public._add_fact_item(s.id, v_idx, v_fid, 0) then v_idx := v_idx + 1; end if;
      end loop;
    end if;
    if v_idx < 5 then
      for v_wid in
        select w.id from public.words w
        where not exists (select 1 from public.quiz_session_items x where x.session_id = s.id and x.word_id = w.id)
        order by (w.id in (select word_id from public.user_word_progress where user_id = uid)) desc, random() limit 10
      loop
        exit when v_idx >= 5;
        if public._add_word_item(s.id, v_idx, v_wid, 'meaning') then v_idx := v_idx + 1; end if;
      end loop;
    end if;

  elsif p_kind = 'learn' then
    if public._add_word_item(s.id, v_idx, p_word_id, 'meaning') then v_idx := v_idx + 1; end if;
    if public._add_word_item(s.id, v_idx, p_word_id, 'cloze') then
      -- cloze falls back to a meaning question when the sentence can't be blanked; skip the duplicate
      if exists (select 1 from public.quiz_session_items a join public.quiz_session_items b
                 on a.session_id = b.session_id and a.idx < b.idx and a.prompt = b.prompt where a.session_id = s.id) then
        delete from public.quiz_session_items where session_id = s.id and idx = v_idx;
      else
        v_idx := v_idx + 1;
      end if;
    end if;

  else -- review: due words from the user's own plans
    for v_wid in
      select p.word_id from public.user_word_progress p
      where p.user_id = uid and p.saved and (p.due_at is null or p.due_at <= now())
        and exists (select 1 from public.daily_plans d where d.user_id = uid and p.word_id = any(d.word_ids))
      order by p.due_at nulls first, p.first_seen_at limit 8
    loop
      if public._add_word_item(s.id, v_idx, v_wid, case when random() < 0.5 then 'cloze' else 'meaning' end) then
        v_idx := v_idx + 1;
      end if;
    end loop;
  end if;

  if v_idx = 0 then
    delete from public.quiz_sessions where id = s.id;
    raise exception 'Nothing to quiz yet';
  end if;
  return public._quiz_payload(s.id);
end $$;


create or replace function public._finish_session(p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.quiz_sessions%rowtype;
  it public.quiz_session_items%rowtype;
  v_score int;
  v_total int;
  v_xp int := 0;
  v_passed boolean;
  v_step int;
  v_cur int;
  v_retry int := 0;
  steps int[] := array[1, 3, 8, 21, 45, 90];
begin
  select * into s from public.quiz_sessions where id = p_session;
  select count(*) filter (where is_correct), count(*) into v_score, v_total
    from public.quiz_session_items where session_id = p_session;
  v_passed := v_total > 0 and v_score = v_total;

  update public.quiz_sessions set finished_at = now(), score = v_score, total = v_total, passed = v_passed
    where id = p_session;

  if s.kind = 'daily' then
    -- The log is written by the server only; the score is the graded one.
    insert into public.user_activity_log (user_id, activity_date, quiz_completed, quiz_score, quiz_perfect)
      values (s.user_id, s.quiz_date, true, v_score, v_passed)
    on conflict (user_id, activity_date) do update
      set quiz_completed = true, quiz_score = excluded.quiz_score, quiz_perfect = excluded.quiz_perfect;
    -- XP for the quiz is the daily quest (15 XP for 4 of 5), paid out by sync_xp.
    v_xp := case when v_score >= 4 then 15 else 0 end;

  elsif s.kind = 'learn' then
    if v_passed then
      perform set_config('app.learn_write', 'on', true);
      update public.user_word_progress set marked_known = true where user_id = s.user_id and word_id = s.word_id;
      perform set_config('app.learn_write', 'off', true);
      v_xp := public.award_xp(s.user_id, 'learn', s.word_id::text, 10);
      delete from public.word_check_cooldowns where user_id = s.user_id and word_id = s.word_id;
    else
      v_retry := public._learn_cooldown_seconds();
      insert into public.word_check_cooldowns (user_id, word_id, retry_available_at, fail_count)
        values (s.user_id, s.word_id, now() + make_interval(secs => v_retry), 1)
      on conflict (user_id, word_id) do update
        set retry_available_at = excluded.retry_available_at,
            fail_count = public.word_check_cooldowns.fail_count + 1,
            updated_at = now();
      -- Close any other open check for this word so nothing is left to resume.
      update public.quiz_sessions set finished_at = now(), passed = false
        where user_id = s.user_id and kind = 'learn' and word_id = s.word_id and finished_at is null and id <> s.id;
    end if;

  else -- review: spaced repetition driven by whether they actually got it right
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
      if it.is_correct then
        v_xp := v_xp + public.award_xp(s.user_id, 'review', it.word_id::text || ':' || s.quiz_date::text, 3);
      end if;
    end loop;
    perform set_config('app.learn_write', 'off', true);
  end if;

  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'xp', v_xp, 'retry_seconds', v_retry);
end $$;
revoke execute on function public._finish_session(uuid) from public, anon, authenticated;
