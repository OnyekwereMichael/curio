-- Daily quiz is five questions; quest XP is 10 (learn) / 15 (4 of 5 on the quiz) / 10 (review 3).

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
    -- A failed check locks that word for 10 minutes.
    select ceil(extract(epoch from (finished_at + interval '10 minutes' - now())))::int into v_wait
      from public.quiz_sessions
      where user_id = uid and kind = 'learn' and word_id = p_word_id and finished_at is not null and passed is not true
      order by finished_at desc limit 1;
    if coalesce(v_wait, 0) > 0 then raise exception 'cooldown:%', v_wait; end if;
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

  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'xp', v_xp);
end $$;
revoke execute on function public._finish_session(uuid) from public, anon, authenticated;

create or replace function public.sync_xp(p_date date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_plan public.daily_plans%rowtype;
  v_log public.user_activity_log%rowtype;
  v_known int;
  v_reviewed int;
  v_xp int;
  v_level int;
  v_new text[] := '{}';
  b record;
  cnt bigint;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if abs(p_date - (now() at time zone 'utc')::date) > 1 then raise exception 'Date out of range'; end if;

  select * into v_plan from public.daily_plans where user_id = uid and plan_date = p_date;
  select count(*) into v_known from public.user_word_progress p
    where p.user_id = uid and p.marked_known and p.word_id = any(coalesce(v_plan.word_ids, '{}'));
  select count(*) into v_reviewed from public.quiz_session_items i
    join public.quiz_sessions s on s.id = i.session_id
    where s.user_id = uid and s.kind = 'review' and s.quiz_date = p_date and i.is_correct;
  select * into v_log from public.user_activity_log where user_id = uid and activity_date = p_date limit 1;

  insert into public.daily_quests (user_id, quest_date, key, target, xp) values
    (uid, p_date, 'learn_words', greatest(coalesce(cardinality(v_plan.word_ids), 0), 1), 10),
    (uid, p_date, 'quiz_score', 4, 15),
    (uid, p_date, 'review_3', 3, 10)
  on conflict do nothing;

  update public.daily_quests q set
    xp = case q.key when 'learn_words' then 10 when 'quiz_score' then 15 when 'review_3' then 10 else q.xp end,
    target = case q.key when 'learn_words' then greatest(coalesce(cardinality(v_plan.word_ids), 0), 1) else q.target end,
    progress = least(
      case q.key
        when 'learn_words' then v_known
        when 'quiz_score' then case when coalesce(v_log.quiz_perfect, false) then 4 else coalesce(v_log.quiz_score, 0) end
        when 'review_3' then v_reviewed
        else q.progress end,
      case q.key when 'learn_words' then greatest(coalesce(cardinality(v_plan.word_ids), 0), 1) else q.target end)
  where q.user_id = uid and q.quest_date = p_date and q.completed_at is null;

  with done as (
    update public.daily_quests set completed_at = now()
    where user_id = uid and quest_date = p_date and completed_at is null and progress >= target
    returning key, xp
  )
  insert into public.xp_events (user_id, source, ref_key, amount)
  select uid, 'quest', p_date::text || ':' || key, xp from done
  on conflict do nothing;

  for b in select * from public.badges
           where key not in (select badge_key from public.user_badges where user_id = uid) loop
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
      if b.xp > 0 then
        insert into public.xp_events (user_id, source, ref_key, amount) values (uid, 'badge', b.key, b.xp) on conflict do nothing;
      end if;
      v_new := array_append(v_new, b.key);
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = uid;
  v_level := floor((1 + sqrt(1 + 4.0 * v_xp / 25)) / 2)::int;
  perform set_config('app.xp_write', 'on', true);
  update public.users set total_xp = v_xp, level = v_level
    where id = uid and (total_xp is distinct from v_xp or level is distinct from v_level);
  perform set_config('app.xp_write', 'off', true);

  return jsonb_build_object('total_xp', v_xp, 'level', v_level, 'new_badges', to_jsonb(v_new));
end $$;
