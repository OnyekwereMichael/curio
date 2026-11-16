-- Word-check cooldown tests. Runs as a real user via the real RPCs, then ROLLS EVERYTHING BACK
-- (the DO block always ends by raising). Success is the message "ALL COOLDOWN TESTS PASSED".
-- Run: paste into the Supabase SQL editor, or `supabase db query -f supabase/tests/word_check_cooldown.test.sql`.
do $test$
declare
  v_user uuid; v_word uuid; s jsonb; r jsonb; q jsonb; v_msg text;
  v_secs int; v_log text := '';
begin
  select d.user_id, w into v_user, v_word
  from public.daily_plans d, unnest(d.word_ids) w
  where not exists (select 1 from public.user_word_progress p where p.user_id = d.user_id and p.word_id = w and p.marked_known)
  limit 1;
  if v_user is null then raise exception 'SETUP: no user with an unlearned planned word'; end if;

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  delete from public.word_check_cooldowns where user_id = v_user and word_id = v_word;
  delete from public.quiz_sessions where user_id = v_user and kind = 'learn' and word_id = v_word;

  -- 1. fresh start works
  s := public.start_quiz('learn', v_word);
  assert jsonb_array_length(s -> 'questions') >= 1, 'start should return questions';
  v_log := v_log || E'\n ok  fresh start allowed';

  -- 2. a double-fired start (the original trigger) resumes the same session instead of creating a second one
  r := public.start_quiz('learn', v_word);
  assert r ->> 'session_id' = s ->> 'session_id', 'second start must resume the same session';
  assert (select count(*) from public.quiz_sessions where user_id = v_user and kind = 'learn' and word_id = v_word) = 1, 'no orphan session';
  v_log := v_log || E'\n ok  double start resumes one session';

  -- 3. fail the check
  for q in select * from jsonb_array_elements(s -> 'questions') loop
    update public.quiz_sessions set created_at = created_at - interval '1 minute' where id = (s ->> 'session_id')::uuid;
    update public.quiz_session_items set answered_at = answered_at - interval '1 minute' where session_id = (s ->> 'session_id')::uuid;
    r := public.answer_quiz((s ->> 'session_id')::uuid, (q ->> 'idx')::int,
          (select o from jsonb_array_elements_text(q -> 'options') o
           where o <> (select correct from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and idx = (q ->> 'idx')::int) limit 1));
  end loop;
  assert (r -> 'result' ->> 'passed')::boolean = false, 'wrong answers must fail';
  assert (r -> 'result' ->> 'retry_seconds')::int = 180, 'cooldown is 3 minutes';
  v_log := v_log || E'\n ok  failed check reports retry_seconds = 180';

  -- 4. immediate retry is rejected, with the server-computed remaining time
  begin
    perform public.start_quiz('learn', v_word);
    raise exception 'FAIL: immediate retry was allowed';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'FAIL%' then raise; end if;
    assert v_msg ~ '^cooldown:(1[5-8][0-9]|180)$', 'expected cooldown:~180 but got ' || v_msg;
  end;
  v_log := v_log || E'\n ok  immediate retry blocked';

  -- 5. "navigating away / new session / new device": a fresh call has no client state, so it is blocked the same way,
  --    and the stored timestamp is what get_word_cooldowns reports
  select seconds_remaining into v_secs from public.get_word_cooldowns(array[v_word]) where word_id = v_word;
  assert v_secs between 150 and 180, 'get_word_cooldowns should report ~180s, got ' || coalesce(v_secs::text, 'null');
  begin
    perform public.start_quiz('learn', v_word);
    raise exception 'FAIL: retry after "navigation" was allowed';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'FAIL%' then raise; end if;
  end;
  v_log := v_log || E'\n ok  blocked after navigating away / new session; cooldown readable';

  -- 6. an unfinished leftover session cannot be used to dodge the cooldown (the original bug)
  insert into public.quiz_sessions (user_id, kind, word_id, expires_at) values (v_user, 'learn', v_word, now() + interval '1 hour');
  begin
    perform public.start_quiz('learn', v_word);
    raise exception 'FAIL: orphan session bypassed the cooldown';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'FAIL%' then raise; end if;
  end;
  delete from public.quiz_sessions where user_id = v_user and kind = 'learn' and word_id = v_word and finished_at is null;
  v_log := v_log || E'\n ok  orphan open session does not bypass cooldown';

  -- 7. device clock manipulation: the server takes no time from the client, so there is nothing to spoof.
  perform set_config('timezone', 'Pacific/Kiritimati', true);
  begin
    perform public.start_quiz('learn', v_word);
    raise exception 'FAIL: changing timezone bypassed the cooldown';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg like 'FAIL%' then raise; end if;
  end;
  v_log := v_log || E'\n ok  still blocked regardless of client clock/timezone (server clock only)';

  -- 8. another word is not blocked
  declare v_other uuid; begin
    select w into v_other from public.daily_plans d, unnest(d.word_ids) w
      where d.user_id = v_user and w <> v_word
        and not exists (select 1 from public.user_word_progress p where p.user_id = v_user and p.word_id = w and p.marked_known)
      limit 1;
    if v_other is not null then
      perform public.start_quiz('learn', v_other);
      v_log := v_log || E'\n ok  other words are not blocked';
    else
      v_log := v_log || E'\n --  (skipped: no second unlearned word in this plan)';
    end if;
  end;

  -- 9. after the cooldown ends the test can be started again
  update public.word_check_cooldowns set retry_available_at = now() - interval '1 second' where user_id = v_user and word_id = v_word;
  assert not exists (select 1 from public.get_word_cooldowns(array[v_word])), 'expired cooldown must not be reported';
  s := public.start_quiz('learn', v_word);
  assert jsonb_array_length(s -> 'questions') >= 1, 'retry after cooldown should work';
  v_log := v_log || E'\n ok  allowed again once the 3 minutes have passed';

  raise exception 'ALL COOLDOWN TESTS PASSED%', v_log;   -- always roll back
end
$test$;
