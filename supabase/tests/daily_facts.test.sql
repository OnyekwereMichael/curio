-- Daily Facts tests. Real tables, real functions, then everything ROLLS BACK (the DO block always ends by raising).
-- Success message: "ALL DAILY FACTS TESTS PASSED". Run: paste into the Supabase SQL editor.
-- now() is frozen inside one transaction, so timing is simulated by back-dating created_at / answered_at.

create function pg_temp.take(p_s jsonb, p_right int) returns jsonb language plpgsql as $$
declare j int; r jsonb; v_key text; sid uuid := (p_s ->> 'session_id')::uuid;
begin
  update public.quiz_sessions set created_at = now() - interval '60 seconds' where id = sid;
  for j in 0 .. jsonb_array_length(p_s -> 'questions') - 1 loop
    update public.quiz_session_items set answered_at = now() - interval '20 seconds' where session_id = sid and answer is not null;
    if j < p_right then
      select correct into v_key from public.quiz_session_items where session_id = sid and idx = j;
    else
      select o into v_key from public.quiz_session_items i, jsonb_array_elements_text(i.options) o where i.session_id = sid and i.idx = j and o <> i.correct limit 1;
    end if;
    r := public.answer_quiz(sid, j, v_key, ((p_s -> 'questions') -> j ->> 'token')::uuid);
  end loop;
  return r;
end $$;

do $test$
declare
  u uuid; u2 uuid; r jsonb; s jsonb; ids uuid[]; ids2 uuid[]; f uuid; g uuid; k int; v_n int; v_log text := ''; v_err text; v_day date := public._lagos_today();
  v_before int; v_pay int;
begin
  select id into u from public.users where id not in (select user_id from public.xp_excluded_users) order by created_at limit 1;
  select id into u2 from public.users where id <> u and id not in (select user_id from public.xp_excluded_users) order by created_at limit 1;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);

  delete from public.xp_events where user_id = u;
  delete from public.daily_quests where user_id = u;
  delete from public.quiz_sessions where user_id = u;
  delete from public.fact_checks where user_id = u;
  delete from public.fact_check_cooldowns where user_id = u;
  delete from public.daily_fact_sets where user_id = u;
  delete from public.user_fact_progress where user_id = u;
  insert into public.user_preferences (user_id, facts_per_day) values (u, 1) on conflict (user_id) do update set facts_per_day = 1;

  -- ───── 1. the daily set: stable all day, no answers leaked, count change applies tomorrow ─────
  r := public.get_daily_facts();
  assert jsonb_array_length(r -> 'facts') = 1, 'expected 1 fact';
  assert not ((r -> 'facts' -> 0) ? 'quiz_questions'), 'the fact payload leaks quiz_questions';
  f := (r -> 'facts' -> 0 ->> 'id')::uuid;
  assert (public.get_daily_facts() -> 'facts' -> 0 ->> 'id')::uuid = f, 'the set changed on reopen';
  update public.user_preferences set facts_per_day = 3 where user_id = u;
  r := public.get_daily_facts();
  assert jsonb_array_length(r -> 'facts') = 1 and (r ->> 'chosen_count')::int = 3, 'a mid-day count change must not alter today''s set';
  v_log := v_log || E'\nPASS 1  set is stable on reopen, has no quiz answers, and a mid-day count change waits until tomorrow';

  -- ───── 2. no repeats until the pool is exhausted ─────
  select fact_ids into ids from public.daily_fact_sets where user_id = u and lagos_date = v_day;
  update public.daily_fact_sets set lagos_date = lagos_date - 1 where user_id = u;     -- "yesterday"
  r := public.get_daily_facts();
  assert jsonb_array_length(r -> 'facts') = 3, 'expected 3 facts';
  select array_agg((e ->> 'id')::uuid) into ids2 from jsonb_array_elements(r -> 'facts') e;
  assert cardinality(ids2) = (select count(distinct x) from unnest(ids2) x), 'duplicate facts in one day';
  assert not (ids2 && ids), 'a fact repeated while unseen facts remained';
  assert not (r ->> 'recycled')::boolean, 'recycled flag set too early';
  v_log := v_log || E'\nPASS 2  3 facts, all different, none seen before';

  -- ───── 3. before 23 Nov the fact rules pay nothing, and say nothing ─────
  assert (select effective_from from public.xp_rules where rule = 'fact_learn') = '2026-11-23 00:00:00+01', 'effective_from is not 23 Nov 00:00 WAT';
  delete from public.daily_fact_sets where user_id = u and lagos_date = v_day;
  update public.user_preferences set facts_per_day = 1 where user_id = u;
  r := public.get_daily_facts();
  f := (r -> 'facts' -> 0 ->> 'id')::uuid;
  s := public.start_fact_quiz(f);
  r := pg_temp.take(s, 99);
  assert (r -> 'result' ->> 'passed')::boolean, 'fact check did not pass';
  assert (select count(*) from public.xp_events where user_id = u and source in ('fact_learn', 'fact_quiz', 'quest')) = 0, 'fact XP paid before its start date';
  assert (r -> 'result' ->> 'xp')::int = 0 and coalesce(r -> 'result' ->> 'reason', 'not_active') = 'not_active', 'result should show no XP and no message: ' || r::text;
  assert exists (select 1 from public.fact_checks where user_id = u and fact_id = f and passed), 'pass not recorded';
  assert (select xp from public.daily_quests where user_id = u and key = 'learn_facts') = 0, 'quest advertises XP before the start date';
  assert (select count(*) from public.xp_events where user_id = u and ref_key like '%learn_facts') = 0, 'fact quest paid';
  v_log := v_log || E'\nPASS 3  before 23 Nov: pass recorded, 0 XP and no message, no separate fact quest; the rule switches on by date alone';

  -- ───── 4. after the start date: 3 + 1 per correct answer, 15 cap however many facts, quest 5 on top ─────
  update public.xp_rules set effective_from = now() - interval '1 day' where rule = 'quest_learn_facts';
  delete from public.xp_events where user_id = u;  delete from public.daily_quests where user_id = u;
  delete from public.quiz_sessions where user_id = u;  delete from public.fact_checks where user_id = u;
  delete from public.daily_fact_sets where user_id = u;
  update public.user_preferences set facts_per_day = 5 where user_id = u;
  r := public.get_daily_facts();
  assert jsonb_array_length(r -> 'facts') = 5, 'expected 5 facts';
  for k in 0 .. 4 loop
    f := (r -> 'facts' -> k ->> 'id')::uuid;
    s := public.start_fact_quiz(f);
    v_before := coalesce((select sum(amount) from public.xp_events where user_id = u), 0);
    s := pg_temp.take(s, 99);
    v_pay := coalesce((select sum(amount) from public.xp_events where user_id = u), 0) - v_before;
    assert v_pay = case when k = 0 then 5 else 0 end, format('fact %s paid %s: the 5 XP quest pays once, on the first pass', k + 1, v_pay);
  end loop;
  assert (select sum(amount) from public.xp_events where user_id = u and source = 'quest') = 5, 'fact quest should have paid exactly 5';
  assert not exists (select 1 from public.xp_events where user_id = u and source in ('fact_learn', 'fact_quiz')), 'a per-fact or per-answer award paid on top of the quest';
  assert not exists (select 1 from public.xp_rejections where user_id = u and reason = 'fact_cap'), 'hitting the cap should not be logged as a blocked attempt';
  assert (select sum(amount) from public.xp_events where user_id = u) = 5, 'facts must add exactly 5 a day';
  v_log := v_log || E'\nPASS 4  5 facts: the single 5 XP fact quest pays once on the first pass, nothing on top';

  -- replays: a passed fact cannot be tested again for XP; the same day pays nothing twice
  begin perform public.start_fact_quiz(f); v_err := 'allowed'; exception when others then v_err := sqlerrm; end;
  assert v_err = 'Already learned', 'a passed fact could be tested again: ' || v_err;
  r := public._award(u, 'quest_learn_facts', 'learn_facts');
  assert r ->> 'reason' = 'already_awarded', 'a replayed award paid';
  r := public._award(u, 'fact_quiz_correct', f::text || ':0');
  assert r ->> 'reason' = 'rule_disabled', 'the retired per-answer fact award is payable';
  r := public._award(u, 'fact_learn', f::text);
  assert r ->> 'reason' = 'rule_disabled', 'the retired per-fact award is payable';
  -- another day's fact set is not accepted for today
  begin perform public.start_fact_quiz((select id from public.facts where id <> all (select unnest(fact_ids) from public.daily_fact_sets where user_id = u) limit 1));
        v_err := 'allowed'; exception when others then v_err := sqlerrm; end;
  assert v_err like '%not in today%', 'a fact outside today''s set was accepted: ' || v_err;
  v_log := v_log || E'\nPASS 4b a passed fact cannot be retested; a fact outside today''s set is refused';

  -- ───── 5. saving: upsert only, no XP, RLS ─────
  v_before := (select sum(amount) from public.xp_events where user_id = u);
  perform public.set_item_saved('fact', f, true);  perform public.set_item_saved('fact', f, false);
  perform public.set_item_saved('fact', f, true);  perform public.set_item_saved('fact', f, true);
  assert (select count(*) from public.user_fact_progress where user_id = u and fact_id = f) = 1, 'duplicate progress rows';
  assert (select count(*) from public.saved_items where user_id = u and item_type = 'fact' and item_id = f) = 1, 'saved_items missing the fact';
  perform public.sync_xp();
  assert (select sum(amount) from public.xp_events where user_id = u) = v_before, 'saving a fact changed XP';
  begin perform public.set_item_saved('thing', f, true); v_err := 'allowed'; exception when others then v_err := sqlerrm; end;
  assert v_err = 'Bad item type', 'unknown item type accepted';
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u2::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.saved_items where item_id = f and user_id = u) = 0, 'another user can see saved items';
  assert (select count(*) from public.daily_fact_sets where user_id = u) = 0, 'another user can see fact sets';
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  begin update public.user_fact_progress set marked_known = true, mastery = 'mastered' where user_id = u; v_err := 'allowed';
  exception when others then v_err := sqlerrm; end;
  assert v_err like '%controlled by the server%', 'client could write review progress: ' || v_err;
  begin insert into public.fact_checks (user_id, lagos_date, fact_id, passed) values (u, v_day, f, true); v_err := 'allowed';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'client could write fact_checks';
  begin insert into public.quiz_bank (item_type, item_id, style, question, correct, wrong, explanation) values ('fact', f, 'recall', 'q', 'c', '{}', 'xxxxxxxxxxx'); v_err := 'allowed';
  exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'client could write quiz_bank';
  begin perform * from public.quiz_bank; v_err := 'allowed'; exception when insufficient_privilege then v_err := null; end;
  assert v_err is null, 'client could read quiz_bank (the answers)';
  reset role;
  v_log := v_log || E'\nPASS 5  save/un-save/re-save a fact: one row, no XP; RLS own rows only; review progress, fact_checks and quiz_bank are not writable or readable by clients';

  -- ───── 6. Review: saved facts appear, filter works, scheduling updates ─────
  update public.daily_quests set completed_at = completed_at where user_id = u;
  s := public.start_review_quiz('fact');
  assert jsonb_array_length(s -> 'questions') >= 1, 'no fact in review';
  assert not exists (select 1 from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and kind <> 'fact'), 'fact filter returned words';
  r := pg_temp.take(s, 99);
  assert (select interval_step from public.user_fact_progress where user_id = u and fact_id = f) = 2, 'review did not schedule the fact';
  assert (select due_at from public.user_fact_progress where user_id = u and fact_id = f) > now(), 'fact not rescheduled into the future';
  begin s := public.start_review_quiz('word');
        assert not exists (select 1 from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and kind = 'fact'), 'word filter returned facts';
  exception when others then if sqlerrm <> 'Nothing to quiz yet' then raise; end if; end;
  v_log := v_log || E'\nPASS 6  a saved fact shows up in Review, the Facts/Words filter separates them, and a correct review reschedules it';

  -- ───── 7. the question bank: validation, drafts never served, answers stay server-side ─────
  select id into g from public.facts where id <> all (select unnest(fact_ids) from public.daily_fact_sets where user_id = u) and public._fact_testable(id) limit 1;
  update public.daily_fact_sets set fact_ids = fact_ids || g where user_id = u and lagos_date = v_day;
  insert into public.quiz_bank (item_type, item_id, style, question, correct, wrong, explanation) values
    ('fact', g, 'application', 'Which scenario applies the idea correctly?', 'A runner paces herself over a long race',
      array['A cook doubles every ingredient', 'A pilot ignores the weather report', 'A clerk files papers alphabetically'], 'Because the idea rewards steady effort.'),
    ('fact', g, 'near_miss', 'Which action fits the idea best?', 'Training a little every single day',
      array['Skipping sleep before a contest', 'Buying new equipment instead', 'Reading about it once and stopping'], 'Small repeated effort is what the fact describes.'),
    ('fact', g, 'compare', 'dupe', 'Alpha beta gamma', array['alpha beta gamma!', 'Delta one', 'Epsilon two'], 'Duplicate options on purpose.'),
    ('fact', g, 'compare', 'near', 'the quick brown fox jumps over', array['the quick brown fox jumps over it', 'A slow green turtle', 'Some other thing entirely'], 'Near duplicate on purpose.'),
    ('fact', g, 'recall', 'Which creature builds nests underground?', 'The creature builds nests', array['A shy tall bird', 'Some quiet fish', 'An old grey cat'], 'Giveaway on purpose.');
  assert (select problems from public.quiz_bank where question = 'Which scenario applies the idea correctly?') = '{}', 'a good question was flagged: ' ||
    (select problems::text from public.quiz_bank where question = 'Which scenario applies the idea correctly?');
  assert (select problems from public.quiz_bank where question = 'dupe') @> array['duplicate_option'], 'duplicate options not caught';
  assert (select problems from public.quiz_bank where question = 'near') @> array['near_duplicate_option'], 'near-duplicate options not caught';
  assert (select problems from public.quiz_bank where question like 'Which creature%') @> array['matching_word_giveaway'], 'word-match giveaway not caught';
  begin update public.quiz_bank set status = 'approved' where question = 'dupe'; v_err := 'allowed'; exception when others then v_err := sqlerrm; end;
  assert v_err like 'Cannot approve%', 'a flagged question was approved';

  -- drafts are never served: the fact still uses its original questions
  s := public.start_fact_quiz(g);
  assert not exists (select 1 from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and bank_id is not null), 'a draft question was served';
  delete from public.quiz_sessions where id = (s ->> 'session_id')::uuid;
  update public.quiz_bank set status = 'approved' where item_id = g and problems = '{}';
  s := public.start_fact_quiz(g);
  assert (select count(distinct bank_id) from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and bank_id is not null) = 2, 'approved questions not served';
  assert not ((s -> 'questions' -> 0) ? 'correct' or (s -> 'questions' -> 0) ? 'explanation' or (s -> 'questions' -> 0) ? 'correct_answer'), 'the answer was sent before answering';
  assert jsonb_array_length(s -> 'questions' -> 0 -> 'options') = 4, 'expected 4 options';
  update public.quiz_sessions set created_at = now() - interval '60 seconds' where id = (s ->> 'session_id')::uuid;
  select correct into v_err from public.quiz_session_items where session_id = (s ->> 'session_id')::uuid and idx = 0;
  r := public.answer_quiz((s ->> 'session_id')::uuid, 0, v_err, ((s -> 'questions') -> 0 ->> 'token')::uuid);
  assert r ->> 'explanation' is not null and (r ->> 'correct')::boolean, 'no explanation after answering: ' || r::text;
  v_log := v_log || E'\nPASS 7  validator catches duplicate / near-duplicate / word-match questions and blocks approving them; drafts are never served; approved ones are, with 4 options, no answer or explanation before answering, and the explanation after';

  raise exception E'ALL DAILY FACTS TESTS PASSED\n%', v_log;
end
$test$;
