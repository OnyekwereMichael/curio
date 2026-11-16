-- Daily-quest XP tests. Exercises the real server code (_finish_session / sync_xp) for a real user, then ROLLS BACK
-- (the DO block always ends by raising). Success message: "ALL XP TESTS PASSED".
-- Expected amounts: learn today's words = 5, quiz 4/5 = 10, review 3 words = 6.
do $test$
declare
  v_user uuid; v_words uuid[]; v_w uuid; v_sess uuid; r jsonb; v_log text := '';
  v_today date := (now() at time zone 'utc')::date;
  v_before bigint; v_after bigint; i int;
begin
  assert public.xp_reward('quest_learn_words') = 5 and public.xp_reward('quest_quiz_score') = 10
     and public.xp_reward('quest_review_3') = 6, 'xp_rewards must hold 5 / 10 / 6';
  assert public.xp_reward('learn_word') = 0 and public.xp_reward('review_answer') = 0, 'no extra per-action XP';
  v_log := v_log || E'\n ok  config is 5 / 10 / 6, no stacked per-action XP';

  select d.user_id, d.word_ids into v_user, v_words from public.daily_plans d
   where d.plan_date = v_today and cardinality(d.word_ids) >= 1 limit 1;
  if v_user is null then raise exception 'SETUP: no user with a plan today'; end if;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  -- clean slate for today (rolled back at the end)
  delete from public.xp_events where user_id = v_user and (ref_key like v_today::text || ':%' or source in ('learn','review'));
  delete from public.daily_quests where user_id = v_user and quest_date = v_today;
  delete from public.user_activity_log where user_id = v_user and activity_date = v_today;
  delete from public.quiz_sessions where user_id = v_user and quiz_date = v_today;
  perform set_config('app.learn_write', 'on', true);
  foreach v_w in array v_words loop
    insert into public.user_word_progress (user_id, word_id) values (v_user, v_w) on conflict do nothing;
    update public.user_word_progress set marked_known = false where user_id = v_user and word_id = v_w;
  end loop;
  perform set_config('app.learn_write', 'off', true);

  -- LEARN: learn every planned word through the real finish path; the quest pays 5 once
  select coalesce(sum(amount), 0) into v_before from public.xp_events where user_id = v_user and source <> 'badge';
  foreach v_w in array v_words loop
    insert into public.quiz_sessions (user_id, kind, word_id, expires_at) values (v_user, 'learn', v_w, now() + interval '1 hour') returning id into v_sess;
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at)
      values (v_sess, 0, 'word', v_w, 'q', '["a","b"]', 'a', 'a', true, now());
    r := public._finish_session(v_sess);
  end loop;
  select coalesce(sum(amount), 0) into v_after from public.xp_events where user_id = v_user and source <> 'badge';
  assert v_after - v_before = 5, 'learning all words must credit exactly 5, got ' || (v_after - v_before);
  assert (r ->> 'xp')::int = 5, 'learn result must display the credited 5, got ' || (r ->> 'xp');
  v_log := v_log || E'\n ok  learn words: credited 5, displayed 5';

  -- repeat: finishing the same learn again / syncing again adds nothing
  insert into public.quiz_sessions (user_id, kind, word_id, expires_at) values (v_user, 'learn', v_words[1], now() + interval '1 hour') returning id into v_sess;
  insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at)
    values (v_sess, 0, 'word', v_words[1], 'q', '["a","b"]', 'a', 'a', true, now());
  r := public._finish_session(v_sess);
  perform public.sync_xp(); perform public.sync_xp();
  select coalesce(sum(amount), 0) into v_after from public.xp_events where user_id = v_user and source <> 'badge';
  assert v_after - v_before = 5, 'repeating learn must not add XP';
  assert (r ->> 'xp')::int = 0, 'repeat must display 0';
  v_log := v_log || E'\n ok  learn repeated: nothing extra';

  -- QUIZ 4/5 = 10 (one wrong answer)
  select coalesce(sum(amount), 0) into v_before from public.xp_events where user_id = v_user and source <> 'badge';
  insert into public.quiz_sessions (user_id, kind, expires_at) values (v_user, 'daily', now() + interval '1 hour') returning id into v_sess;
  for i in 0..4 loop
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at)
      values (v_sess, i, 'word', v_words[1], 'q', '["a","b"]', 'a', case when i = 4 then 'b' else 'a' end, i <> 4, now());
  end loop;
  r := public._finish_session(v_sess);
  select coalesce(sum(amount), 0) into v_after from public.xp_events where user_id = v_user and source <> 'badge';
  assert v_after - v_before = 10, 'quiz 4/5 must credit exactly 10, got ' || (v_after - v_before);
  assert (r ->> 'xp')::int = 10, 'quiz result must display the credited 10, got ' || (r ->> 'xp');
  v_log := v_log || E'\n ok  quiz 4/5: credited 10, displayed 10';

  -- second quiz the same day with a perfect score: quest already paid, so 0 more
  insert into public.quiz_sessions (user_id, kind, expires_at) values (v_user, 'daily', now() + interval '1 hour') returning id into v_sess;
  for i in 0..4 loop
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at)
      values (v_sess, i, 'word', v_words[1], 'q', '["a","b"]', 'a', 'a', true, now());
  end loop;
  r := public._finish_session(v_sess);
  select coalesce(sum(amount), 0) into v_after from public.xp_events where user_id = v_user and source <> 'badge';
  assert v_after - v_before = 10 and (r ->> 'xp')::int = 0, 'second quiz the same day must add 0';
  v_log := v_log || E'\n ok  quiz repeated: nothing extra';

  -- REVIEW 3 correct = 6
  select coalesce(sum(amount), 0) into v_before from public.xp_events where user_id = v_user and source <> 'badge';
  insert into public.quiz_sessions (user_id, kind, expires_at) values (v_user, 'review', now() + interval '1 hour') returning id into v_sess;
  for i in 0..2 loop
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at)
      values (v_sess, i, 'word', v_words[1], 'q', '["a","b"]', 'a', 'a', true, now());
  end loop;
  r := public._finish_session(v_sess);
  select coalesce(sum(amount), 0) into v_after from public.xp_events where user_id = v_user and source <> 'badge';
  assert v_after - v_before = 6, 'review of 3 must credit exactly 6, got ' || (v_after - v_before);
  assert (r ->> 'xp')::int = 6, 'review result must display the credited 6, got ' || (r ->> 'xp');
  v_log := v_log || E'\n ok  review 3: credited 6, displayed 6';

  -- review repeated
  insert into public.quiz_sessions (user_id, kind, expires_at) values (v_user, 'review', now() + interval '1 hour') returning id into v_sess;
  for i in 0..2 loop
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at)
      values (v_sess, i, 'word', v_words[1], 'q', '["a","b"]', 'a', 'a', true, now());
  end loop;
  r := public._finish_session(v_sess);
  select coalesce(sum(amount), 0) into v_after from public.xp_events where user_id = v_user and source <> 'badge';
  assert v_after - v_before = 6 and (r ->> 'xp')::int = 0, 'second review the same day must add 0';
  v_log := v_log || E'\n ok  review repeated: nothing extra';

  -- what the quests panel shows equals what was paid
  assert (select sum(q.xp) from public.daily_quests q where q.user_id = v_user and q.quest_date = v_today and q.completed_at is not null) = 21,
    'completed quests display 5 + 10 + 6 = 21';
  assert (select sum(amount) from public.xp_events where user_id = v_user and source = 'quest' and ref_key like v_today::text || ':%') = 21,
    'quest XP credited is 21';
  v_log := v_log || E'\n ok  quest panel amounts (5 + 10 + 6) match credited XP';

  raise exception E'ALL XP TESTS PASSED%', v_log;
end $test$;
