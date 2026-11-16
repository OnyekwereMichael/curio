-- One place for XP amounts, and one code path that credits them.
--
-- Root cause of the wrong totals: the amounts were hardcoded in several places that did not agree
-- (quest amounts typed twice inside sync_xp, 10 per word and 3 per review answer inside _finish_session,
-- and a separate "15" for the quiz result screen), and every action was paid twice: once directly and once
-- again through the daily quest. The screens then showed a number computed somewhere else.
--
-- Now: amounts live in xp_rewards; the quests are the only payout for learn / quiz / review (the old
-- per-word and per-answer amounts are kept as rows set to 0); and finishing a session settles the quests
-- and reports the XP that was actually credited, so what you see is what you got.

create table if not exists public.xp_rewards (
  key text primary key,
  amount int not null check (amount >= 0),
  description text not null
);
alter table public.xp_rewards enable row level security;   -- no policies: read through get_xp_rewards()
insert into public.xp_rewards (key, amount, description) values
  ('quest_learn_words', 5,  'Daily quest: learn today''s words (paid once, when the last one is learned)'),
  ('quest_quiz_score',  10, 'Daily quest: score 4 of 5 on the daily quiz (paid once a day)'),
  ('quest_review_3',    6,  'Daily quest: answer 3 saved words correctly in review (paid once a day)'),
  ('learn_word',        0,  'Extra XP per word learned, on top of the quest (off)'),
  ('review_answer',     0,  'Extra XP per correct review answer, on top of the quest (off)')
on conflict (key) do update set amount = excluded.amount, description = excluded.description;

create or replace function public.xp_reward(p_key text) returns int
language plpgsql stable security definer set search_path = public as $$
declare v int;
begin
  select amount into v from public.xp_rewards where key = p_key;
  if v is null then raise exception 'Unknown XP reward %', p_key; end if;
  return v;
end $$;
revoke execute on function public.xp_reward(text) from public, anon, authenticated;

create or replace function public.get_xp_rewards() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, amount), '{}'::jsonb) from public.xp_rewards
$$;
revoke execute on function public.get_xp_rewards() from public, anon;
grant execute on function public.get_xp_rewards() to authenticated;

create or replace function public._sync_xp_for(p_uid uuid, p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := p_uid;
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

  select * into v_plan from public.daily_plans where user_id = uid and plan_date = p_date;
  select count(*) into v_known from public.user_word_progress p
    where p.user_id = uid and p.marked_known and p.word_id = any(coalesce(v_plan.word_ids, '{}'));
  select count(*) into v_reviewed from public.quiz_session_items i
    join public.quiz_sessions s on s.id = i.session_id
    where s.user_id = uid and s.kind = 'review' and s.quiz_date = p_date and i.is_correct;
  select * into v_log from public.user_activity_log where user_id = uid and activity_date = p_date limit 1;

  insert into public.daily_quests (user_id, quest_date, key, target, xp) values
    (uid, p_date, 'learn_words', greatest(coalesce(cardinality(v_plan.word_ids), 0), 1), public.xp_reward('quest_learn_words')),
    (uid, p_date, 'quiz_score', 4, public.xp_reward('quest_quiz_score')),
    (uid, p_date, 'review_3', 3, public.xp_reward('quest_review_3'))
  on conflict do nothing;

  update public.daily_quests q set
    xp = case q.key when 'learn_words' then public.xp_reward('quest_learn_words') when 'quiz_score' then public.xp_reward('quest_quiz_score') when 'review_3' then public.xp_reward('quest_review_3') else q.xp end,
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

revoke execute on function public._sync_xp_for(uuid, date) from public, anon, authenticated;

-- What the app calls: same checks as before, then the shared logic above.
create or replace function public.sync_xp(p_date date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if abs(p_date - (now() at time zone 'utc')::date) > 1 then raise exception 'Date out of range'; end if;
  return public._sync_xp_for(auth.uid(), p_date);
end $$;

-- Quests that are not finished yet pick up the new amounts straight away (finished ones keep what was paid).
update public.daily_quests set xp = case key
  when 'learn_words' then public.xp_reward('quest_learn_words')
  when 'quiz_score' then public.xp_reward('quest_quiz_score')
  when 'review_3' then public.xp_reward('quest_review_3') else xp end
where completed_at is null;

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
  v_before bigint;
  steps int[] := array[1, 3, 8, 21, 45, 90];
begin
  select * into s from public.quiz_sessions where id = p_session;
  -- Everything the user is credited by finishing this session is measured below (badges are reported separately).
  select coalesce(sum(amount), 0) into v_before from public.xp_events where user_id = s.user_id and source <> 'badge';
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
    -- The quiz pays through the daily quest (xp_rewards.quest_quiz_score), settled below.

  elsif s.kind = 'learn' then
    if v_passed then
      perform set_config('app.learn_write', 'on', true);
      update public.user_word_progress set marked_known = true where user_id = s.user_id and word_id = s.word_id;
      perform set_config('app.learn_write', 'off', true);
      perform public.award_xp(s.user_id, 'learn', s.word_id::text, public.xp_reward('learn_word'));
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
        perform public.award_xp(s.user_id, 'review', it.word_id::text || ':' || s.quiz_date::text, public.xp_reward('review_answer'));
      end if;
    end loop;
    perform set_config('app.learn_write', 'off', true);
  end if;

  -- Settle the daily quests now, so the XP reported to the screen is exactly what was credited.
  perform public._sync_xp_for(s.user_id, s.quiz_date);
  select coalesce(sum(amount), 0) - v_before into v_xp from public.xp_events where user_id = s.user_id and source <> 'badge';

  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'xp', v_xp, 'retry_seconds', v_retry);
end $$;
revoke execute on function public._finish_session(uuid) from public, anon, authenticated;
