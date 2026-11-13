alter table public.user_word_progress add column if not exists mastery text not null default 'new';
alter table public.user_word_progress add column if not exists interval_step int not null default 0;
alter table public.user_word_progress add column if not exists due_at timestamptz;
alter table public.user_word_progress add column if not exists review_count int not null default 0;
alter table public.user_word_progress add column if not exists last_reviewed_at timestamptz;
do $$ begin
  alter table public.user_word_progress add constraint user_word_progress_mastery_check check (mastery in ('new','learning','mastered'));
exception when duplicate_object then null; end $$;
create index if not exists user_word_progress_due_idx on public.user_word_progress(user_id, due_at) where saved;

-- Spaced repetition: steps are [1,3,8,21,45,90] days. "Not yet" resets to step 0,
-- "Sort of" holds (at least step 1), "Knew it" jumps two steps. Step 4+ = mastered.
create or replace function public.rate_review(p_word_id uuid, p_rating text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  steps int[] := array[1,3,8,21,45,90];
  cur public.user_word_progress%rowtype;
  v_step int;
  v_mastery text;
  v_due timestamptz;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_rating not in ('not-yet','sort-of','knew-it') then raise exception 'Bad rating'; end if;

  select * into cur from public.user_word_progress where user_id = uid and word_id = p_word_id;
  if not found then raise exception 'Word not in your progress'; end if;

  v_step := case p_rating
    when 'not-yet' then 0
    when 'sort-of' then greatest(cur.interval_step, 1)
    else least(cur.interval_step + 2, 5) end;
  v_mastery := case when v_step >= 4 then 'mastered' else 'learning' end;
  v_due := now() + make_interval(days => steps[v_step + 1]);

  update public.user_word_progress set
    interval_step = v_step, mastery = v_mastery, due_at = v_due,
    review_count = review_count + 1, last_reviewed_at = now()
  where id = cur.id;

  return jsonb_build_object('interval_step', v_step, 'mastery', v_mastery, 'due_at', v_due);
end $$;
revoke execute on function public.rate_review(uuid, text) from public, anon;
grant execute on function public.rate_review(uuid, text) to authenticated;

insert into public.badges (key, name, kind, threshold, param, color, xp) values
  ('first-mastered','First mastered','mastered',1,null,'moss',25),
  ('mastered-10','Ten mastered','mastered',10,null,'moss',25)
on conflict (key) do nothing;

-- sync_xp: adds the "review 3 saved words" quest and the mastery badges.
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
  select count(*) into v_reviewed from public.user_word_progress p
    where p.user_id = uid and (p.last_reviewed_at at time zone 'utc')::date = p_date;
  select * into v_log from public.user_activity_log where user_id = uid and activity_date = p_date limit 1;

  insert into public.daily_quests (user_id, quest_date, key, target, xp) values
    (uid, p_date, 'learn_words', greatest(coalesce(cardinality(v_plan.word_ids), 0), 1), 20),
    (uid, p_date, 'quiz_score', 4, 30),
    (uid, p_date, 'review_3', 3, 15)
  on conflict do nothing;

  update public.daily_quests q set
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

  if coalesce(v_log.quiz_completed, false) then
    insert into public.xp_events (user_id, source, ref_key, amount)
    values (uid, 'quiz', p_date::text,
      coalesce(v_log.quiz_score, 0) * 5 + 10 + case when coalesce(v_log.quiz_perfect, false) then 15 else 0 end)
    on conflict do nothing;
  end if;

  for b in select * from public.badges
           where key not in (select badge_key from public.user_badges where user_id = uid) loop
    cnt := case b.kind
      when 'streak' then (select greatest(coalesce(current_streak, 0), coalesce(longest_streak, 0)) from public.users where id = uid)
      when 'words' then (select count(*) from public.user_word_progress where user_id = uid and marked_known)
      when 'quizzes' then (select count(*) from public.user_activity_log where user_id = uid and quiz_completed)
      when 'perfect' then (select count(*) from public.user_activity_log where user_id = uid and quiz_perfect)
      when 'mastered' then (select count(*) from public.user_word_progress where user_id = uid and mastery = 'mastered')
      when 'topic' then (select count(*) from public.user_fact_progress p join public.facts f on f.id = p.fact_id
                         where p.user_id = uid and f.topic = b.param)
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
