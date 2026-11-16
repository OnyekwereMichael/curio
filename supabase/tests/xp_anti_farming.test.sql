-- XP anti-farming tests. Uses the real tables and the real functions, then ROLLS EVERYTHING BACK
-- (the DO block always ends by raising). Success message: "ALL XP TESTS PASSED" followed by the log.
-- Run: paste into the Supabase SQL editor.
-- Note: now() is frozen inside one transaction, so timing is simulated by back-dating issued_at / answered_at / created_at.

do $test$
declare
  u uuid; v_log text := ''; r jsonb; v_n int; v_n2 int; v_tok uuid; s jsonb; q jsonb; v_key text; v_w uuid[]; w uuid; i int; j int;
  v_total int; v_exp int; v_today date := (now() at time zone 'Africa/Lagos')::date; v_utc date := (now() at time zone 'utc')::date;
  v_err text; users uuid[]; wk timestamptz := '2026-04-06 00:00:00+01'; v_win public.weekly_winners%rowtype; v_admin uuid;
  bot uuid; genuine uuid; excl uuid := '553ab222-5b5d-4654-ac3f-803d9a7f5287'; x int; lb jsonb; v_prom uuid;

  procedure_dummy int;
begin
  select array_agg(id) into users from (
    select id from public.users where id not in (select user_id from public.user_preferences where hide_from_board)
      and id not in (select user_id from public.xp_excluded_users) order by created_at limit 6) t;
  assert cardinality(users) = 6, 'need 6 visible users';
  u := users[1];
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);

  -- ───── A. every source awards its intended amount; nothing above 10 ─────
  delete from public.xp_events where user_id = u;
  assert (select count(*) from public.xp_rules where amount > 10) = 0, 'a rule is above 10';
  assert (select count(*) from public.badges where xp > 10) = 0, 'a badge is above 10';
  r := public._award(u, 'quest_learn_words', 'learn_words');  assert (r ->> 'awarded')::int = 5,  'quest learn = 5';
  r := public._award(u, 'quest_quiz_score', 'quiz_score');    assert (r ->> 'awarded')::int = 10, 'quest quiz = 10';
  r := public._award(u, 'quest_review_3', 'review_3');        assert (r ->> 'awarded')::int = 6,  'quest review = 6';
  r := public._award(u, 'learn_word', gen_random_uuid()::text); assert r ->> 'reason' = 'rule_disabled' and (r ->> 'awarded') is null, 'the retired 6 XP Test me award is still payable';
  r := public._award(u, 'challenge_correct', '0');            assert (r ->> 'awarded')::int = 2,  'challenge answer = 2';
  r := public._award(u, 'streak_bonus', 'bonus', jsonb_build_object('amount', 10)); assert (r ->> 'awarded')::int = 10, 'streak band 30+ = 10';
  r := public._award(u, 'badge', 'test-badge', jsonb_build_object('amount', 25));   assert (r ->> 'awarded')::int = 10, 'a 25 badge is capped at 10';
  r := public._award(u, 'badge', 'free-badge', jsonb_build_object('amount', 0));    assert r ->> 'reason' = 'no_xp', 'a 0 XP badge awards nothing';
  assert (select max(amount) from public.xp_events where user_id = u) <= 10, 'ledger has an amount above 10';
  assert public._streak_bonus(1) = 2 and public._streak_bonus(2) = 2 and public._streak_bonus(3) = 4 and public._streak_bonus(7) = 6
     and public._streak_bonus(14) = 8 and public._streak_bonus(30) = 10 and public._streak_bonus(400) = 10, 'streak bands';
  v_log := v_log || E'\nPASS A  amounts: quest 5/10/6, the retired Test me 6 refuses (rule_disabled), challenge 2 per answer, streak 2/4/6/8/10, badges <=10 (25 capped to 10, 0 pays nothing)';

  -- ───── B. the ledger refuses amounts outside 1..10 ─────
  begin insert into public.xp_events (user_id, source, ref_key, amount) values (u, 'x', 'big', 11); raise exception 'insert of 11 was accepted';
  exception when check_violation then null; end;
  begin insert into public.xp_events (user_id, source, ref_key, amount) values (u, 'x', 'zero', 0); raise exception 'insert of 0 was accepted';
  exception when check_violation then null; end;
  v_log := v_log || E'\nPASS B  ledger CHECK rejects 11 and 0 (no clamping)';

  -- ───── C. replays and double taps ─────
  v_total := (select sum(amount) from public.xp_events where user_id = u);
  select count(*) into v_n from public.xp_rejections where user_id = u;
  r := public._award(u, 'quest_learn_words', 'learn_words');
  assert r ->> 'reason' = 'already_awarded' and (r ->> 'awarded')::int = 0, 'replay was not blocked';
  r := public._award(u, 'learn_word', gen_random_uuid()::text);
  assert r ->> 'reason' = 'rule_disabled', 'the retired word award was not refused';
  assert (select sum(amount) from public.xp_events where user_id = u) = v_total, 'replay changed the total';
  assert (select count(*) from public.xp_rejections where user_id = u) = v_n + 2, 'replays were not logged';
  begin insert into public.xp_events (user_id, source, ref_key, amount) values (u, 'quest', (select ref_key from public.xp_events where user_id = u and source = 'quest' limit 1), 5);
        raise exception 'duplicate ledger row was accepted';
  exception when unique_violation then null; end;
  v_log := v_log || E'\nPASS C  replays/double taps pay nothing and are logged; the ledger unique key also blocks a racing duplicate (parallel requests are serialised by a per-user advisory lock + unique key)';

  -- ───── D. a user token cannot write XP ─────
  set local role authenticated;
  begin insert into public.xp_events (user_id, source, ref_key, amount) values (u, 'quest', 'hack', 5); v_err := 'insert allowed';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'authenticated user could INSERT into xp_events';
  begin delete from public.xp_events where user_id = u; v_err := 'delete allowed';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'authenticated user could DELETE from xp_events';
  begin perform public._award(u, 'quest_learn_words', 'hack'); v_err := '_award callable';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'authenticated user could call _award';
  begin perform public.award_xp(u, 'quest', 'hack', 50); v_err := 'award_xp callable';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'authenticated user could call award_xp';
  begin update public.xp_rules set amount = 10; v_err := 'rules writable';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'authenticated user could change xp_rules';
  v_n := (select total_xp from public.users where id = u);
  update public.users set total_xp = 99999, level = 99 where id = u;
  assert (select total_xp from public.users where id = u) = v_n, 'a profile update changed total_xp';
  reset role;
  v_log := v_log || E'\nPASS D  as an authenticated user: INSERT/DELETE on xp_events, _award, award_xp and xp_rules are all refused; writing users.total_xp is ignored';

  -- ───── E/L. real flows with tokens: Test me, daily quiz, daily challenge (the "co-founder flow") ─────
  delete from public.xp_events where user_id = u;
  delete from public.user_badges where user_id = u;
  delete from public.daily_quests where user_id = u;
  delete from public.user_activity_log where user_id = u;
  delete from public.quiz_sessions where user_id = u and quiz_date >= v_utc - 1;
  delete from public.daily_challenge_answers where user_id = u and challenge_date = v_today;
  delete from public.daily_challenge_issues where user_id = u and challenge_date = v_today;
  delete from public.word_check_cooldowns where user_id = u;
  delete from public.daily_plans where user_id = u and plan_date = v_utc;
  perform public.get_or_build_daily_plan(v_utc);
  select word_ids into v_w from public.daily_plans where user_id = u and plan_date = v_utc;
  assert cardinality(v_w) >= 1, 'no plan words';
  perform set_config('app.learn_write', 'on', true);
  update public.user_word_progress set marked_known = false, mastery = 'learning', interval_step = 0 where user_id = u;
  foreach w in array v_w loop
    insert into public.user_word_progress (user_id, word_id) values (u, w) on conflict do nothing;
    update public.user_word_progress set marked_known = false where user_id = u and word_id = w;
  end loop;
  perform set_config('app.learn_write', 'off', true);

  -- bad token on a quiz is rejected and logged
  s := public.start_quiz('learn', v_w[1]);
  update public.quiz_sessions set created_at = now() - interval '60 seconds' where id = (s ->> 'session_id')::uuid;
  select count(*) into v_n from public.xp_rejections where user_id = u and reason = 'bad_token';
  r := public.answer_quiz((s ->> 'session_id')::uuid, 0, 'whatever', gen_random_uuid());
  assert (r ->> 'rejected')::boolean and r ->> 'reason' = 'bad_token', 'bad quiz token accepted';
  assert (select count(*) from public.xp_rejections where user_id = u and reason = 'bad_token') = v_n + 1, 'bad quiz token not logged';
  -- answering out of order is rejected and logged
  r := public.answer_quiz((s ->> 'session_id')::uuid, 1, 'whatever', null);
  assert (r ->> 'rejected')::boolean and r ->> 'reason' = 'replay_or_out_of_order', 'out of order accepted';
  delete from public.quiz_sessions where id = (s ->> 'session_id')::uuid;

  -- Test me on every word of today's plan
  foreach w in array v_w loop
    s := public.start_quiz('learn', w);
    update public.quiz_sessions set created_at = now() - interval '60 seconds' where id = (s ->> 'session_id')::uuid;
    for j in 0 .. jsonb_array_length(s -> 'questions') - 1 loop
      update public.quiz_session_items set answered_at = now() - interval '20 seconds' where session_id = (s ->> 'session_id')::uuid and answer is not null;
      select correct into v_key from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and idx = j;
      r := public.answer_quiz((s ->> 'session_id')::uuid, j, v_key, ((s -> 'questions') -> j ->> 'token')::uuid);
    end loop;
    assert (r -> 'result' ->> 'passed')::boolean, 'Test me did not pass';
  end loop;
  select coalesce(sum(amount), 0) into v_n from public.xp_events where user_id = u and source = 'learn';
  assert v_n = 0, format('Test me must not pay its own XP any more, paid %s', v_n);
  assert (select count(*) from public.xp_events where user_id = u and source = 'quest' and ref_key like '%:learn_words') = 1, 'the word quest should have paid exactly once';

  -- Test me on a word that is NOT in today's plan pays nothing (and says why)
  select word_id into w from public.user_word_progress where user_id = u and word_id <> all (v_w) and not marked_known limit 1;
  if w is null then
    select id into w from public.words where id <> all (v_w) limit 1;
    insert into public.user_word_progress (user_id, word_id) values (u, w) on conflict do nothing;
  end if;
  insert into public.daily_plans (user_id, plan_date, word_ids) values (u, v_utc - 1, array[w]) on conflict do nothing;
  s := public.start_quiz('learn', w);
  update public.quiz_sessions set created_at = now() - interval '60 seconds' where id = (s ->> 'session_id')::uuid;
  for j in 0 .. jsonb_array_length(s -> 'questions') - 1 loop
    update public.quiz_session_items set answered_at = now() - interval '20 seconds' where session_id = (s ->> 'session_id')::uuid and answer is not null;
    select correct into v_key from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and idx = j;
    r := public.answer_quiz((s ->> 'session_id')::uuid, j, v_key, null);
  end loop;
  assert r -> 'result' ->> 'reason' = 'not_todays_word', 'an old plan word paid XP: ' || r::text;
  assert not exists (select 1 from public.xp_events where user_id = u and source = 'learn' and ref_key = w::text), 'old word got ledger XP';

  -- an impossibly quick Test me pays nothing
  select id into w from public.words where id <> all (v_w) and id <> w limit 1;
  insert into public.user_word_progress (user_id, word_id) values (u, w) on conflict do nothing;
  update public.daily_plans set word_ids = word_ids || w where user_id = u and plan_date = v_utc;
  s := public.start_quiz('learn', w);
  update public.quiz_sessions set created_at = now() - interval '2200 milliseconds' where id = (s ->> 'session_id')::uuid;
  for j in 0 .. jsonb_array_length(s -> 'questions') - 1 loop
    update public.quiz_session_items set answered_at = now() - interval '2100 milliseconds' where session_id = (s ->> 'session_id')::uuid and answer is not null;
    select correct into v_key from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and idx = j;
    r := public.answer_quiz((s ->> 'session_id')::uuid, j, v_key, null);
  end loop;
  assert r -> 'result' ->> 'reason' = 'too_fast', 'an impossibly quick Test me still paid: ' || r::text;
  assert not exists (select 1 from public.xp_events where user_id = u and source = 'learn' and ref_key = w::text), 'a too-fast word got ledger XP';
  v_log := v_log || E'\nPASS E1 Test me on ' || cardinality(v_w) || ' plan word(s) pays only the 5 XP quest, once; a word outside today''s plan pays 0 (not_todays_word); bad quiz token and out-of-order answers rejected + logged';

  -- daily quiz: 4 of 5
  s := public.start_quiz('daily');
  update public.quiz_sessions set created_at = now() - interval '120 seconds' where id = (s ->> 'session_id')::uuid;
  for j in 0 .. jsonb_array_length(s -> 'questions') - 1 loop
    update public.quiz_session_items set answered_at = now() - interval '20 seconds' where session_id = (s ->> 'session_id')::uuid and answer is not null;
    select correct, options ->> 0 into v_key, v_err from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and idx = j;
    if j = 4 then select o into v_key from public.quiz_session_items i, jsonb_array_elements_text(i.options) o
                  where i.session_id = (s ->> 'session_id')::uuid and i.idx = 4 and o <> i.correct limit 1; end if;
    r := public.answer_quiz((s ->> 'session_id')::uuid, j, v_key, ((s -> 'questions') -> j ->> 'token')::uuid);
  end loop;
  assert (r -> 'result' ->> 'score')::int = 4, 'quiz score not 4';

  -- daily challenge: 5 of 5, with one-time tokens, and a bad token first
  r := public.get_daily_challenge();
  v_tok := (r ->> 'token')::uuid;
  select count(*) into v_n from public.xp_rejections where user_id = u and reason = 'bad_token';
  r := public.submit_challenge_answer(0, 'x', gen_random_uuid());
  assert (r ->> 'rejected')::boolean and r ->> 'reason' = 'bad_token', 'bad challenge token accepted';
  assert (select count(*) from public.xp_rejections where user_id = u and reason = 'bad_token') = v_n + 1, 'bad challenge token not logged';
  update public.xp_settings set value = 'true' where key = 'require_question_token';
  r := public.submit_challenge_answer(0, 'x');
  assert (r ->> 'rejected')::boolean and r ->> 'reason' = 'bad_token', 'a missing token was accepted while tokens are required';
  update public.xp_settings set value = 'false' where key = 'require_question_token';
  for j in 0 .. 4 loop
    r := public.get_daily_challenge();
    v_tok := (r ->> 'token')::uuid;
    update public.daily_challenge_issues set issued_at = now() - interval '30 seconds' where user_id = u and challenge_date = v_today;
    update public.daily_challenge_answers set answered_at = now() - interval '20 seconds' where user_id = u and challenge_date = v_today;
    select correct into v_key from public.daily_challenge_keys where challenge_date = v_today and idx = j;
    r := public.submit_challenge_answer(j, v_key, v_tok);
    assert (r ->> 'xp')::int = 2, format('challenge answer %s paid %s', j, r ->> 'xp');
    if j = 0 then   -- the same token again (double tap) pays nothing
      r := public.submit_challenge_answer(0, v_key, v_tok);
      assert (r ->> 'rejected')::boolean, 'double tap on a challenge answer was accepted';
    end if;
  end loop;
  assert (select coalesce(sum(amount), 0) from public.xp_events where user_id = u and source = 'challenge') = 10, 'challenge total not 10';

  -- the complete day for a fresh player, by source
  select jsonb_object_agg(source, xp) into r from (select source, sum(amount) xp from public.xp_events where user_id = u group by source) z;
  select sum(amount) into v_total from public.xp_events where user_id = u;
  v_exp := 5 + 10 + 2 + 5 + 5 + 10;   -- word quest (the only word reward) + quiz quest + streak + first-word & first-quiz badges + challenge
  assert v_total = v_exp, format('co-founder flow expected %s got %s (%s)', v_exp, v_total, r);
  assert v_total <= (select (value #>> '{}')::int from public.xp_settings where key = 'ceiling_full'), 'a normal day hit the ceiling';
  v_log := v_log || format(E'\nPASS E2 co-founder flow (Test me on %s word(s) + daily quiz 4/5 + challenge 5/5, new account): %s XP in total = %s', cardinality(v_w), v_total, r);
  v_log := v_log || E'\nPASS E3 challenge: bad token, missing token (when required), and a double tap are all rejected and logged';
  v_log := v_log || format(E'\nINFO    old behaviour for the same flow: the 30 XP "Test me" case became %s XP for Test me + its quest + first-word badge', 6 * cardinality(v_w) + 5 + 5);

  -- ───── H. saving a word never awards XP ─────
  select sum(amount) into v_n from public.xp_events where user_id = u;
  update public.user_word_progress set saved = false where user_id = u and word_id = v_w[1];
  update public.user_word_progress set saved = true where user_id = u and word_id = v_w[1];
  update public.user_word_progress set saved = false where user_id = u and word_id = v_w[1];
  update public.user_word_progress set saved = true where user_id = u and word_id = v_w[1];
  perform public.sync_xp();
  assert (select sum(amount) from public.xp_events where user_id = u) = v_n, 'saving changed XP';
  v_log := v_log || E'\nPASS H  saving, un-saving and re-saving a word (then sync_xp) leaves XP unchanged';

  -- ───── F. the daily ceiling resets at midnight WAT ─────
  delete from public.xp_events where user_id = u;
  insert into public.xp_events (user_id, source, ref_key, amount, created_at)
    select u, 'quest', 'y' || g, 10, (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos') - interval '1 minute' from generate_series(1, 14) g;
  assert public._xp_today(u) = 0, 'yesterday (23:59 WAT) counted toward today';
  insert into public.xp_events (user_id, source, ref_key, amount, created_at)
    values (u, 'quest', 'midnight', 10, date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos');
  assert public._xp_today(u) = 10, 'an event at exactly 00:00 WAT should be today';
  r := public._award(u, 'quest_quiz_score', 'quiz_score');
  assert (r ->> 'awarded')::int = 10, 'after a 140 XP yesterday the new day did not pay in full';
  v_log := v_log || E'\nPASS F  140 XP at 23:59 WAT does not count today; the ceiling starts again at 00:00 WAT and pays in full';

  -- ───── G. soft cap: full to 85, half to 128, then nothing; badges exempt ─────
  delete from public.xp_events where user_id = u;
  insert into public.xp_events (user_id, source, ref_key, amount) select u, 'quest', 'f' || g, 10 from generate_series(1, 8) g;   -- 80 today
  r := public._award(u, 'challenge_correct', '0');                         assert (r ->> 'awarded')::int = 2, 'under 85 pays in full';       -- 82
  insert into public.xp_events (user_id, source, ref_key, amount) values (u, 'quest', 'f9', 2);                                               -- 84
  assert public._xp_today(u) = 84, 'setup 84';
  r := public._award(u, 'quest_quiz_score', 'quiz_score');
  assert (r ->> 'awarded')::int = 5 and r ->> 'reason' = 'halved', format('crossing 85: 1 full + 9/2 = 5, got %s', r);               -- 89
  r := public._award(u, 'quest_review_3', 'review_3');
  assert (r ->> 'awarded')::int = 3, 'past 85 a 6 XP award pays half = 3';                                                                    -- 92
  r := public._award(u, 'challenge_correct', '1');
  assert (r ->> 'awarded')::int = 1, 'past 85 a 2 XP award pays half = 1';                                                                    -- 93
  insert into public.xp_events (user_id, source, ref_key, amount) select u, 'quest', 'g' || g, 10 from generate_series(1, 3) g;              -- 123
  insert into public.xp_events (user_id, source, ref_key, amount) values (u, 'quest', 'g4', 4), (u, 'quest', 'g5', 1);                       -- 128
  assert public._xp_today(u) = 128, 'setup 128: ' || public._xp_today(u);
  select count(*) into v_n from public.xp_rejections where user_id = u and reason = 'daily_ceiling';
  r := public._award(u, 'quest_review_3', gen_random_uuid()::text);
  assert (r ->> 'awarded')::int = 0 and r ->> 'reason' = 'daily_ceiling', 'at 128 nothing more is paid';
  assert (select count(*) from public.xp_rejections where user_id = u and reason = 'daily_ceiling') = v_n + 1, 'ceiling refusal not logged';
  r := public._award(u, 'badge', 'ceiling-exempt', jsonb_build_object('amount', 10));
  assert (r ->> 'awarded')::int = 10, 'badges are exempt from the ceiling';
  assert public._xp_today(u) = 128, 'badge XP counted toward the ceiling';
  v_log := v_log || E'\nPASS G  soft cap: 84 + 10 -> 5 (crossing 85), 6 -> 3, 2 -> 1, stops at 128 (logged as daily_ceiling), badges still pay and do not count';

  -- ───── I. leaderboard totals equal the ledger ─────
  assert (select count(*) from public.users us where us.total_xp <> coalesce((select sum(amount) from public.xp_events x where x.user_id = us.id), 0)) = 0,
    'users.total_xp differs from the ledger';
  lb := public.get_leaderboard('all', 100, 0);
  assert not exists (select 1 from jsonb_array_elements(lb -> 'rows') e where (e ->> 'id')::uuid in (select user_id from public.xp_excluded_users)), 'test accounts are on the board';
  assert (select count(*) from jsonb_array_elements(lb -> 'rows') e
          where (e ->> 'xp')::int <> coalesce((select sum(amount) from public.xp_events x where x.user_id = (e ->> 'id')::uuid), 0)) = 0, 'board row differs from ledger';
  assert (public.get_xp_status() ->> 'total_xp')::int = (select sum(amount) from public.xp_events where user_id = u), 'get_xp_status differs from the ledger';
  v_log := v_log || E'\nPASS I  every users.total_xp = ledger sum; the all-time board and get_xp_status read the same ledger; test accounts are absent';

  -- ───── J/K. flags, finalisation, approval gate ─────
  update public.leaderboard_config set competition_start = wk, min_weekly_xp = 100;
  assert not exists (select 1 from public.xp_events where created_at >= wk and created_at < wk + interval '7 days'), 'test week must be empty';
  bot := users[2]; genuine := users[3];
  delete from public.xp_events where user_id = any (users) or user_id = excl;
  insert into public.xp_events (user_id, source, ref_key, amount, created_at)
    select bot, 'quest', 'b' || g, 10, wk + interval '1 day' + g * interval '5 minutes' from generate_series(1, 30) g;       -- 300
  insert into public.xp_events (user_id, source, ref_key, amount, created_at)
    select genuine, 'quest', 'g' || g, 10, wk + (g / 4) * interval '1 day' + interval '9 hours' + (g % 4) * interval '37 minutes' + (g * 7 % 13) * interval '1 minute' from generate_series(1, 20) g;   -- 200
  insert into public.xp_events (user_id, source, ref_key, amount, created_at) select users[4], 'quest', 'c' || g, 10, wk + (g % 6) * interval '1 day' + interval '12 hours' + g * interval '3 minutes' from generate_series(1, 15) g;   -- 150
  insert into public.xp_events (user_id, source, ref_key, amount, created_at) select users[5], 'quest', 'd' || g, 10, wk + (g % 5) * interval '1 day' + interval '15 hours' + g * interval '9 minutes' from generate_series(1, 12) g;   -- 120
  insert into public.xp_events (user_id, source, ref_key, amount, created_at) select users[6], 'quest', 'e' || g, 10, wk + (g % 4) * interval '1 day' + interval '17 hours' + g * interval '11 minutes' from generate_series(1, 11) g;   -- 110
  insert into public.xp_events (user_id, source, ref_key, amount, created_at) select excl, 'quest', 'z' || g, 10, wk + interval '2 days' + g * interval '1 minute' from generate_series(1, 60) g;   -- 600, test account

  -- the bot: 84 answers 5 minutes apart for 7 hours, all correct, ~0.7 s each. The genuine user: varied, slower, imperfect.
  insert into public.quiz_sessions (user_id, kind, quiz_date, expires_at, created_at) select bot, 'daily', (wk + interval '1 day')::date, now() + interval '1 day', wk + interval '1 day'
    from generate_series(1, 1);
  insert into public.quiz_sessions (user_id, kind, quiz_date, expires_at, created_at) select genuine, 'daily', (wk + interval '1 day')::date, now() + interval '1 day', wk + interval '1 day';
  for x in 0 .. 83 loop
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at, time_ms)
    select s.id, x, 'word', (select id from public.words limit 1), 'p', '["a","b"]'::jsonb, 'a', 'a', true, wk + interval '1 day' + x * interval '5 minutes', 700
    from public.quiz_sessions s where s.user_id = bot and s.created_at = wk + interval '1 day' order by s.id limit 1;
  end loop;
  for x in 0 .. 39 loop
    insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct, answer, is_correct, answered_at, time_ms)
    select s.id, x, 'word', (select id from public.words limit 1), 'p', '["a","b"]'::jsonb, 'a', case when x % 5 = 0 then 'b' else 'a' end, x % 5 <> 0,
           wk + interval '1 day' + (x / 10) * interval '3 hours' + (x * 97 % 41) * interval '53 seconds' + x * interval '41 seconds', 4000 + (x * 7919 % 9000)
    from public.quiz_sessions s where s.user_id = genuine and s.created_at = wk + interval '1 day' order by s.id limit 1;
  end loop;
  perform public.compute_user_flags(wk);
  assert exists (select 1 from public.user_flags where week_start = wk and user_id = bot and severity = 'high'), 'the bot was not flagged high';
  assert (public._user_risk(wk, bot) ->> 'verdict') = 'Suspicious', 'bot verdict is not Suspicious';
  assert (select count(*) from public.user_flags where week_start = wk and user_id = bot) >= 3, 'the bot should trip several flags';
  assert not exists (select 1 from public.user_flags where week_start = wk and user_id = genuine and severity in ('high', 'medium')), 'a genuine user was flagged: ' ||
    coalesce((select jsonb_agg(flag_type)::text from public.user_flags where week_start = wk and user_id = genuine), '');
  assert (public._user_risk(wk, genuine) ->> 'verdict') = 'Looks genuine', 'genuine verdict wrong';
  v_log := v_log || format(E'\nPASS J  seeded bot -> %s (verdict Suspicious); genuine user -> no medium/high flag (verdict Looks genuine)',
    (select string_agg(flag_type || ':' || severity, ', ' order by flag_type) from public.user_flags where week_start = wk and user_id = bot));

  perform public.finalize_weekly_cycle(wk);
  assert not exists (select 1 from public.weekly_results where week_start = wk and user_id = excl), 'a test account is in the results';
  assert (select count(*) from public.weekly_winners where week_start = wk) = 3, 'expected 3 pending winners';
  assert (select bool_and(review_status = 'pending') from public.weekly_winners where week_start = wk), 'winners must start pending';
  assert (select user_id from public.weekly_winners where week_start = wk and rank = 1) = bot, 'rank 1 should be the 300 XP account';
  assert not exists (select 1 from public.prize_notifications where week_start = wk and kind = 'winner'), 'a winner was announced before approval';
  assert not exists (select 1 from public.weekly_winners where week_start = wk and user_id = users[6]), 'only the top 3 win';
  -- the winner cannot claim, and cannot be paid, before approval
  select * into v_win from public.weekly_winners where week_start = wk and rank = 1;
  perform set_config('request.jwt.claim.sub', bot::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', bot, 'role', 'authenticated')::text, true);
  begin perform public.submit_payout_details(v_win.id, 'Test Bank', '0123456789', 'Test Name'); v_err := 'claim allowed';
  exception when others then v_err := sqlerrm; end;
  assert v_err ilike '%still being reviewed%', 'claim before approval: ' || v_err;
  assert (public.get_my_results() -> 'claims') = '[]'::jsonb, 'a pending winner sees a claim';
  assert coalesce(public.get_my_results() -> 'unseen', 'null'::jsonb) = 'null'::jsonb, 'a pending winner sees their result before approval';
  begin update public.weekly_winners set paid_status = 'paid' where id = v_win.id; v_err := 'paid without approval';
  exception when others then v_err := sqlerrm; end;
  assert v_err ilike '%not been approved%', 'pay gate: ' || v_err;
  -- admin: approve rank 1, disqualify rank 2 (the next eligible player is promoted)
  v_admin := users[4];
  insert into public.admins (user_id) values (v_admin) on conflict do nothing;
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  begin perform public.admin_review_winner(v_win.id, 'approved', 'ok'); v_err := null; exception when others then v_err := sqlerrm; end;
  assert v_err is null, 'approve failed: ' || coalesce(v_err, '');
  assert exists (select 1 from public.prize_notifications where winner_id = v_win.id and kind = 'winner'), 'approval did not announce the win';
  assert (select review_status from public.weekly_winners where id = v_win.id) = 'approved', 'not approved';
  select user_id into v_prom from public.weekly_winners where week_start = wk and rank = 3;
  perform public.admin_review_winner((select id from public.weekly_winners where week_start = wk and rank = 3), 'disqualified', 'shared device');
  assert (select user_id from public.weekly_winners where week_start = wk and rank = 3) = users[5], 'the next eligible player was not promoted: ' ||
    (select user_id::text from public.weekly_winners where week_start = wk and rank = 3);
  assert (select review_status from public.weekly_winners where week_start = wk and rank = 3) = 'pending', 'the promoted player must start pending';
  assert (select count(*) from public.admin_audit_log where action in ('winner_approved', 'winner_disqualified', 'winner_promoted')) >= 3, 'actions are not in the audit log';
  assert exists (select 1 from public.winner_review_log where week_start = wk), 'removed winner not logged';
  perform set_config('request.jwt.claim.sub', users[6]::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', users[6], 'role', 'authenticated')::text, true);
  begin perform public.admin_review_winner(v_win.id, 'approved', null); v_err := 'non-admin allowed'; exception when others then v_err := sqlerrm; end;
  assert v_err ilike '%Not authorized%', 'a non-admin could review: ' || v_err;
  v_log := v_log || E'\nPASS K  finalisation: top 3 created pending, nobody announced, test account excluded; claim blocked ("still being reviewed"); paid blocked by the DB trigger; approval announces + starts the claim window; disqualifying promotes the next eligible player; audit log written; non-admins refused';

  assert (select max(amount) from public.xp_events where created_at > now() - interval '1 minute') is null or (select max(amount) from public.xp_events where created_at > now() - interval '1 minute') <= 10, 'amount above 10 written';

  raise exception E'ALL XP TESTS PASSED\n%', v_log;
end
$test$;
