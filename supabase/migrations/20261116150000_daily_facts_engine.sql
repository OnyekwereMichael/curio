-- Daily Facts, step 3: the engine. Builds the day's fact set, grades the fact check, schedules fact reviews,
-- and adds the fact quest. The live quiz/XP functions are patched in place with anchored replacements:
-- if any anchor is missing the whole migration aborts and nothing changes.

-- Patches for one function are collected first and the function is rewritten once, after every anchor matched.
create temp table _pf (sig regprocedure primary key, def text not null) on commit drop;
create function pg_temp._patch(p_sig regprocedure, p_old text, p_new text) returns void language plpgsql as $$
declare d text; n text;
begin
  select def into d from _pf where sig = p_sig;
  if d is null then d := pg_get_functiondef(p_sig); end if;
  if position(p_new in d) > 0 then return; end if; -- already applied
  n := replace(d, p_old, p_new);
  if n = d then raise exception 'patch anchor not found in %: %', p_sig, left(p_old, 70); end if;
  insert into _pf values (p_sig, n) on conflict (sig) do update set def = excluded.def;
end $$;

-- ── today's facts (Lagos day), frozen once built ──
create function public.get_daily_facts() returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_day date := public._lagos_today();
  v_utc date := (now() at time zone 'utc')::date;
  prefs public.user_preferences%rowtype;
  v_n int := 1; v_topics text[] := '{}';
  st public.daily_fact_sets%rowtype;
  v_ids uuid[] := '{}'; v_first uuid; v_more uuid[]; v_recycled boolean := false;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(hashtextextended('facts:' || uid::text, 0));

  select * into prefs from public.user_preferences where user_id = uid;
  if found then v_n := prefs.facts_per_day; v_topics := coalesce(prefs.fact_topics, '{}'); end if;

  select * into st from public.daily_fact_sets where user_id = uid and lagos_date = v_day;
  if not found then
    -- the first fact is today's plan fact, so the daily quiz and this set agree (unless it was already shown before)
    perform public.get_or_build_daily_plan(v_utc);
    select fact_id into v_first from public.daily_plans where user_id = uid and plan_date = v_utc;
    if v_first is not null and public._fact_testable(v_first)
       and not exists (select 1 from public.daily_fact_sets s where s.user_id = uid and v_first = any(s.fact_ids)) then
      v_ids := array[v_first];
    end if;

    if cardinality(v_ids) < v_n then
      select coalesce(array_agg(id), '{}') into v_more from (
        select f.id from public.facts f
        where (f.publish_date is null or f.publish_date <= v_utc) and public._fact_testable(f.id) and f.id <> all (v_ids)
        order by
          (exists (select 1 from public.user_fact_progress p where p.user_id = uid and p.fact_id = f.id)
           or exists (select 1 from public.daily_fact_sets s where s.user_id = uid and f.id = any(s.fact_ids))),   -- never-shown first
          (cardinality(v_topics) = 0 or f.topic = any(v_topics)) desc,
          coalesce((select p.seen_at from public.user_fact_progress p where p.user_id = uid and p.fact_id = f.id), 'epoch'::timestamptz),
          md5(uid::text || v_day::text || f.id::text)
        limit v_n - cardinality(v_ids)
      ) x;
      v_ids := v_ids || v_more;
    end if;

    if cardinality(v_ids) = 0 then
      return jsonb_build_object('date', v_day, 'chosen_count', v_n, 'set_size', 0, 'recycled', false,
                                'facts', '[]'::jsonb, 'passed', '[]'::jsonb, 'saved', '[]'::jsonb);
    end if;

    v_recycled := exists (select 1 from public.user_fact_progress p where p.user_id = uid and p.fact_id = any(v_ids));
    insert into public.daily_fact_sets (user_id, lagos_date, fact_ids, chosen_count, recycled)
    values (uid, v_day, v_ids, v_n, v_recycled)
    on conflict (user_id, lagos_date) do nothing;
    insert into public.user_fact_progress (user_id, fact_id, seen_at)
      select uid, x, now() from unnest(v_ids) x on conflict (user_id, fact_id) do nothing;
    select * into st from public.daily_fact_sets where user_id = uid and lagos_date = v_day;
  end if;

  return jsonb_build_object(
    'date', st.lagos_date, 'chosen_count', v_n, 'set_size', cardinality(st.fact_ids), 'recycled', st.recycled,
    'facts', coalesce((select jsonb_agg(to_jsonb(f) - 'quiz_questions' order by t.ord)
                       from unnest(st.fact_ids) with ordinality t(id, ord) join public.facts f on f.id = t.id), '[]'::jsonb),
    'passed', coalesce((select jsonb_agg(c.fact_id) from public.fact_checks c
                        where c.user_id = uid and c.lagos_date = v_day and c.passed), '[]'::jsonb),
    'saved', coalesce((select jsonb_agg(p.fact_id) from public.user_fact_progress p
                       where p.user_id = uid and p.saved and p.fact_id = any(st.fact_ids)), '[]'::jsonb));
end $$;
revoke all on function public.get_daily_facts() from public, anon;
grant execute on function public.get_daily_facts() to authenticated;

-- ── Test me on a fact: two questions, graded by the server, same shape as a word check ──
create function public.start_fact_quiz(p_fact uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.quiz_sessions%rowtype; v_wait int; v_idx int := 0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':fact:' || p_fact::text, 0));

  select ceil(extract(epoch from (retry_available_at - now())))::int into v_wait
    from public.fact_check_cooldowns where user_id = uid and fact_id = p_fact;
  if coalesce(v_wait, 0) > 0 then raise exception 'cooldown:%', v_wait; end if;

  if not exists (select 1 from public.daily_fact_sets where user_id = uid and lagos_date = public._lagos_today() and p_fact = any(fact_ids)) then
    raise exception 'That fact is not in today''s set';
  end if;
  if exists (select 1 from public.fact_checks where user_id = uid and lagos_date = public._lagos_today() and fact_id = p_fact and passed) then
    raise exception 'Already learned';
  end if;

  select * into s from public.quiz_sessions
    where user_id = uid and kind = 'learn' and fact_id = p_fact and finished_at is null and expires_at > now()
    order by created_at desc limit 1;
  if found then return public._quiz_payload(s.id); end if;

  insert into public.quiz_sessions (user_id, kind, quiz_date, fact_id, expires_at)
  values (uid, 'learn', (now() at time zone 'utc')::date, p_fact, now() + interval '1 hour')
  returning * into s;

  if public._add_fact_item(s.id, v_idx, p_fact, 0) then v_idx := v_idx + 1; end if;
  if public._add_fact_item(s.id, v_idx, p_fact, 1) then v_idx := v_idx + 1; end if;
  if v_idx = 0 then
    delete from public.quiz_sessions where id = s.id;
    raise exception 'Nothing to quiz yet';
  end if;
  return public._quiz_payload(s.id);
end $$;
revoke all on function public.start_fact_quiz(uuid) from public, anon;
grant execute on function public.start_fact_quiz(uuid) to authenticated;

-- ── Review with an All / Words / Facts filter ──
create function public.start_review_quiz(p_filter text default 'all') returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_filter not in ('all', 'word', 'fact') then raise exception 'Bad filter'; end if;
  -- an abandoned, untouched review would otherwise be handed back with the wrong mix
  update public.quiz_sessions s set finished_at = now()
    where s.user_id = auth.uid() and s.kind = 'review' and s.finished_at is null
      and not exists (select 1 from public.quiz_session_items i where i.session_id = s.id and i.answer is not null);
  perform set_config('app.review_filter', p_filter, true);
  return public.start_quiz('review', null);
end $$;
revoke all on function public.start_review_quiz(text) from public, anon;
grant execute on function public.start_review_quiz(text) to authenticated;

-- ── patch start_quiz: saved facts join the review, honouring the filter ──
select pg_temp._patch('public.start_quiz(text,uuid)'::regprocedure,
  E'    for v_wid in\n      select p.word_id from public.user_word_progress p\n      where p.user_id = uid and p.saved and (p.due_at is null or p.due_at <= now())',
  E'    if coalesce(nullif(current_setting(''app.review_filter'', true), ''''), ''all'') in (''all'', ''word'') then\n    for v_wid in\n      select p.word_id from public.user_word_progress p\n      where p.user_id = uid and p.saved and (p.due_at is null or p.due_at <= now())');

select pg_temp._patch('public.start_quiz(text,uuid)'::regprocedure,
  E'    end loop;\n  end if;\n\n  if v_idx = 0 then',
  E'    end loop;\n    end if;\n    if coalesce(nullif(current_setting(''app.review_filter'', true), ''''), ''all'') in (''all'', ''fact'') then\n      for v_fid in\n        select p.fact_id from public.user_fact_progress p\n        where p.user_id = uid and p.saved and (p.due_at is null or p.due_at <= now())\n          and (exists (select 1 from public.daily_plans d where d.user_id = uid and d.fact_id = p.fact_id)\n               or exists (select 1 from public.daily_fact_sets fs where fs.user_id = uid and p.fact_id = any(fs.fact_ids)))\n          and public._fact_testable(p.fact_id)\n        order by p.due_at nulls first, p.seen_at limit 4\n      loop\n        if public._add_fact_item(s.id, v_idx, v_fid, (random() * 1)::int) then v_idx := v_idx + 1; end if;\n      end loop;\n    end if;\n  end if;\n\n  if v_idx = 0 then');

-- ── patch _finish_session: the fact check, and fact reviews ──
select pg_temp._patch('public._finish_session(uuid)'::regprocedure,
  E'  steps int[] := array[1, 3, 8, 21, 45, 90];',
  E'  steps int[] := array[1, 3, 8, 21, 45, 90];\n  v_r2 jsonb; v_inset boolean;');

select pg_temp._patch('public._finish_session(uuid)'::regprocedure,
  E'  if s.kind = ''daily'' then\n    insert into public.user_activity_log (user_id, activity_date, quiz_completed, quiz_score, quiz_perfect)',
  E'  if s.fact_id is not null then
    v_inset := exists (select 1 from public.daily_fact_sets where user_id = s.user_id and lagos_date = public._lagos_today() and s.fact_id = any(fact_ids));
    if v_passed then
      perform set_config(''app.learn_write'', ''on'', true);
      update public.user_fact_progress set marked_known = true where user_id = s.user_id and fact_id = s.fact_id;
      perform set_config(''app.learn_write'', ''off'', true);
      delete from public.fact_check_cooldowns where user_id = s.user_id and fact_id = s.fact_id;
    else
      v_retry := public._learn_cooldown_seconds();
      insert into public.fact_check_cooldowns (user_id, fact_id, retry_available_at, fail_count)
        values (s.user_id, s.fact_id, now() + make_interval(secs => v_retry), 1)
      on conflict (user_id, fact_id) do update
        set retry_available_at = excluded.retry_available_at,
            fail_count = public.fact_check_cooldowns.fail_count + 1, updated_at = now();
    end if;

    if not v_inset then
      v_res := public._xp_reject(s.user_id, ''fact_learn'', s.fact_id::text, ''not_todays_fact'');
    else
      insert into public.fact_checks (user_id, lagos_date, fact_id, passed, score, total)
        values (s.user_id, public._lagos_today(), s.fact_id, v_passed, v_score, v_total)
      on conflict (user_id, lagos_date, fact_id) do update
        set passed = public.fact_checks.passed or excluded.passed,
            score = greatest(coalesce(public.fact_checks.score, 0), excluded.score), total = excluded.total;
      if extract(epoch from (now() - s.created_at)) * 1000 < public._xp_cfg(''min_session_ms'') then
        v_res := public._xp_reject(s.user_id, ''fact_learn'', s.fact_id::text, ''too_fast'');
      else
        if v_passed then
          v_res := public._award(s.user_id, ''fact_learn'', s.fact_id::text,
                    jsonb_build_object(''item_id'', s.fact_id, ''session_id'', s.id, ''is_correct'', true,
                      ''time_ms'', (select sum(time_ms) from public.quiz_session_items where session_id = s.id)));
        end if;
        for it in select * from public.quiz_session_items where session_id = p_session and is_correct order by idx loop
          if not exists (select 1 from public.xp_events where user_id = s.user_id and source = ''fact_quiz''
                         and ref_key = public._lagos_today()::text || '':'' || s.fact_id::text || '':'' || it.idx) then
            v_r2 := public._award(s.user_id, ''fact_quiz_correct'', s.fact_id::text || '':'' || it.idx,
                      jsonb_build_object(''item_id'', s.fact_id, ''session_id'', s.id, ''is_correct'', true, ''time_ms'', it.time_ms));
            if v_r2 ->> ''reason'' in (''fact_cap'', ''daily_ceiling'') then v_reason := v_r2 ->> ''reason''; end if;
          end if;
        end loop;
      end if;
    end if;
    v_reason := coalesce(v_reason, v_res ->> ''reason'');

  elsif s.kind = ''daily'' then\n    insert into public.user_activity_log (user_id, activity_date, quiz_completed, quiz_score, quiz_perfect)');

select pg_temp._patch('public._finish_session(uuid)'::regprocedure,
  E'      where user_id = s.user_id and word_id = it.word_id;\n    end loop;',
  E'      where user_id = s.user_id and word_id = it.word_id;
      if it.fact_id is not null then
        select interval_step into v_cur from public.user_fact_progress where user_id = s.user_id and fact_id = it.fact_id;
        v_step := case when it.is_correct then least(coalesce(v_cur, 0) + 2, 5) else 0 end;
        update public.user_fact_progress set
          interval_step = v_step,
          mastery = case when v_step >= 4 then ''mastered'' else ''learning'' end,
          due_at = now() + make_interval(days => steps[v_step + 1]),
          review_count = review_count + 1,
          last_reviewed_at = now()
        where user_id = s.user_id and fact_id = it.fact_id;
      end if;\n    end loop;');

-- ── patch _sync_xp_for: the "learn your facts" quest ──
select pg_temp._patch('public._sync_xp_for(uuid,date)'::regprocedure,
  E'  v_quiz_done boolean := false; v_res jsonb; v_reason text;',
  E'  v_quiz_done boolean := false; v_res jsonb; v_reason text;\n  v_set public.daily_fact_sets%rowtype; v_fpass int := 0;');

select pg_temp._patch('public._sync_xp_for(uuid,date)'::regprocedure,
  E'  select * into v_log from public.user_activity_log where user_id = uid and activity_date = v_utc limit 1;\n',
  E'  select * into v_log from public.user_activity_log where user_id = uid and activity_date = v_utc limit 1;
  select * into v_set from public.daily_fact_sets where user_id = uid and lagos_date = v_today;
  select count(*) into v_fpass from public.fact_checks c
    where c.user_id = uid and c.lagos_date = v_today and c.passed and c.fact_id = any(coalesce(v_set.fact_ids, ''{}''));\n');

select pg_temp._patch('public._sync_xp_for(uuid,date)'::regprocedure,
  E'  on conflict do nothing;\n\n  update public.daily_quests dq set\n    xp = (select amount from public.xp_rules where rule = ''quest_'' || dq.key),',
  E'  on conflict do nothing;

  if coalesce(cardinality(v_set.fact_ids), 0) > 0 then
    insert into public.daily_quests (user_id, quest_date, key, target, xp)
    values (uid, v_today, ''learn_facts'', 1, public._xp_rule_amount(''quest_learn_facts''))
    on conflict do nothing;
  end if;

  update public.daily_quests dq set
    xp = case when dq.key = ''learn_facts'' then public._xp_rule_amount(''quest_learn_facts'')
              else (select amount from public.xp_rules where rule = ''quest_'' || dq.key) end,');

select pg_temp._patch('public._sync_xp_for(uuid,date)'::regprocedure,
  E'        when ''review_3'' then v_reviewed\n',
  E'        when ''review_3'' then v_reviewed\n        when ''learn_facts'' then v_fpass\n');

-- Rewrite each patched function once, now that every anchor matched.
do $$ declare r record; begin
  for r in select def from _pf loop execute r.def; end loop;
end $$;
