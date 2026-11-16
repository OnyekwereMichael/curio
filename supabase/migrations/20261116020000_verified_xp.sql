-- Verified XP: XP is only awarded for learning the server has graded.
--
-- Before: the client wrote quiz_score / marked_known / streaks straight into tables and
-- sync_xp trusted them, so XP could be forged (or clicked through) without learning anything.
-- After:
--   * quizzes, "I know this" checks and reviews are server-built sessions graded by answer_quiz
--   * the columns that feed XP are locked against client writes
--   * every award goes through award_xp, which enforces per-source daily/weekly caps
--   * streak/topic badges are derived from verified data

-- ───────────────────────── tables ─────────────────────────
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily', 'learn', 'review')),
  quiz_date date not null default (now() at time zone 'utc')::date,
  word_id uuid references public.words(id) on delete cascade,   -- learn sessions only
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  score int,
  total int,
  passed boolean
);
create index if not exists quiz_sessions_user_idx on public.quiz_sessions(user_id, kind, quiz_date);

create table if not exists public.quiz_session_items (
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  idx int not null,
  kind text not null check (kind in ('word', 'fact')),
  word_id uuid references public.words(id) on delete cascade,
  fact_id uuid references public.facts(id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct text not null,        -- never sent to the client
  answer text,
  is_correct boolean,
  answered_at timestamptz,
  primary key (session_id, idx)
);

-- No policies on purpose: clients reach these only through the security-definer functions below.
alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_items enable row level security;

-- Per-source XP ceilings. Sources not listed (quiz, challenge, quest, badge) are naturally
-- once-per-day / once-ever.
create table if not exists public.xp_source_caps (
  source text primary key,
  daily_cap int,
  weekly_cap int
);
alter table public.xp_source_caps enable row level security;
insert into public.xp_source_caps (source, daily_cap, weekly_cap) values
  ('learn', 100, 300),
  ('review', 60, 200)
on conflict (source) do nothing;

-- ───────────────────────── lock the columns XP is derived from ─────────────────────────
create or replace function public.protect_learning_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.learn_write', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.marked_known := false;
      new.mastery := 'new';
      new.interval_step := 0;
      new.due_at := null;
      new.review_count := 0;
      new.last_reviewed_at := null;
    else
      new.marked_known := old.marked_known;
      new.mastery := old.mastery;
      new.interval_step := old.interval_step;
      new.due_at := old.due_at;
      new.review_count := old.review_count;
      new.last_reviewed_at := old.last_reviewed_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists user_word_progress_protect on public.user_word_progress;
create trigger user_word_progress_protect before insert or update on public.user_word_progress
  for each row execute function public.protect_learning_columns();

-- The quiz result is written by the server now; clients may still read their own rows.
revoke insert, update, delete on public.user_activity_log from authenticated, anon;

-- Self-rated reviews are replaced by graded review sessions.
revoke execute on function public.rate_review(uuid, text) from authenticated, anon, public;

-- ───────────────────────── XP awarding with caps ─────────────────────────
create or replace function public.award_xp(p_user uuid, p_source text, p_ref text, p_amount int)
returns int language plpgsql security definer set search_path = public as $$
declare
  cap public.xp_source_caps%rowtype;
  v_amount int := greatest(coalesce(p_amount, 0), 0);
  v_day timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_week timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_used int;
  v_rows int;
begin
  select * into cap from public.xp_source_caps where source = p_source;
  if found then
    if cap.daily_cap is not null then
      select coalesce(sum(amount), 0) into v_used from public.xp_events
        where user_id = p_user and source = p_source and created_at >= v_day;
      v_amount := least(v_amount, cap.daily_cap - v_used);
    end if;
    if cap.weekly_cap is not null then
      select coalesce(sum(amount), 0) into v_used from public.xp_events
        where user_id = p_user and source = p_source and created_at >= v_week;
      v_amount := least(v_amount, cap.weekly_cap - v_used);
    end if;
  end if;
  if v_amount <= 0 then return 0; end if;
  insert into public.xp_events (user_id, source, ref_key, amount)
    values (p_user, p_source, p_ref, v_amount) on conflict do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then v_amount else 0 end;
end $$;
revoke execute on function public.award_xp(uuid, text, text, int) from public, anon, authenticated;

-- ───────────────────────── question builders ─────────────────────────
-- mode 'meaning': "What does X mean?"  mode 'cloze': fill the blank in the example sentence.
create or replace function public._add_word_item(p_session uuid, p_idx int, p_word uuid, p_mode text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w public.words%rowtype;
  v_prompt text;
  v_correct text;
  v_wrong text[];
  v_blank text;
  v_pattern text;
begin
  select * into w from public.words where id = p_word;
  if not found then return false; end if;

  if p_mode = 'cloze' and nullif(btrim(coalesce(w.example_sentence, '')), '') is not null then
    v_pattern := regexp_replace(w.word, '([.^$*+?(){}|\[\]\\])', '\\\1', 'g');
    v_blank := regexp_replace(w.example_sentence, v_pattern, '_____', 'gi');
    if v_blank <> w.example_sentence then
      select array_agg(word) into v_wrong from (
        select word from (select distinct on (lower(word)) word from public.words
                          where lower(word) <> lower(w.word)) d
        order by random() limit 3) q;
      if coalesce(cardinality(v_wrong), 0) = 3 then
        v_prompt := 'Which word completes the sentence? "' || v_blank || '"';
        v_correct := w.word;
      end if;
    end if;
  end if;

  if v_correct is null then
    select array_agg(definition) into v_wrong from (
      select definition from (select distinct definition from public.words
                              where id <> w.id and definition <> w.definition) d
      order by random() limit 3) q;
    if coalesce(cardinality(v_wrong), 0) < 3 then return false; end if;
    v_prompt := 'What does "' || w.word || '" mean?';
    v_correct := w.definition;
  end if;

  insert into public.quiz_session_items (session_id, idx, kind, word_id, prompt, options, correct)
  values (p_session, p_idx, 'word', w.id, v_prompt,
          (select jsonb_agg(o order by random()) from unnest(v_wrong || v_correct) o), v_correct);
  return true;
end $$;
revoke execute on function public._add_word_item(uuid, int, uuid, text) from public, anon, authenticated;

create or replace function public._add_fact_item(p_session uuid, p_idx int, p_fact uuid, p_q int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  q jsonb;
  v_wrong text[];
begin
  select quiz_questions -> p_q into q from public.facts where id = p_fact;
  if q is null or q ->> 'question' is null or q ->> 'correct' is null then return false; end if;
  select array_agg(x) into v_wrong from jsonb_array_elements_text(coalesce(q -> 'wrong', '[]'::jsonb)) x;
  if coalesce(cardinality(v_wrong), 0) < 1 then return false; end if;
  insert into public.quiz_session_items (session_id, idx, kind, fact_id, prompt, options, correct)
  values (p_session, p_idx, 'fact', p_fact, q ->> 'question',
          (select jsonb_agg(o order by random()) from unnest(v_wrong || (q ->> 'correct')) o), q ->> 'correct');
  return true;
end $$;
revoke execute on function public._add_fact_item(uuid, int, uuid, int) from public, anon, authenticated;

-- What the client is allowed to see: prompts and options, never the key.
create or replace function public._quiz_payload(p_session uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'session_id', s.id,
    'kind', s.kind,
    'word_id', s.word_id,
    'answered', (select count(*) from public.quiz_session_items i where i.session_id = s.id and i.answer is not null),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('idx', i.idx, 'question', i.prompt, 'options', i.options) order by i.idx)
                           from public.quiz_session_items i where i.session_id = s.id), '[]'::jsonb))
  from public.quiz_sessions s where s.id = p_session;
$$;
revoke execute on function public._quiz_payload(uuid) from public, anon, authenticated;

-- ───────────────────────── start a session ─────────────────────────
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

    foreach v_wid in array coalesce(v_plan.word_ids, '{}') loop
      exit when v_idx >= 2;
      if public._add_word_item(s.id, v_idx, v_wid, 'meaning') then v_idx := v_idx + 1; end if;
    end loop;

    select p.word_id into v_wid from public.user_word_progress p
      where p.user_id = uid and not (p.word_id = any(coalesce(v_plan.word_ids, '{}')))
        and exists (select 1 from public.daily_plans d where d.user_id = uid and p.word_id = any(d.word_ids))
      order by random() limit 1;
    if v_wid is not null and public._add_word_item(s.id, v_idx, v_wid, 'cloze') then v_idx := v_idx + 1; end if;

    if v_plan.fact_id is not null then
      for i in 0..1 loop
        if public._add_fact_item(s.id, v_idx, v_plan.fact_id, i) then v_idx := v_idx + 1; end if;
      end loop;
    end if;
    select p.fact_id into v_fid from public.user_fact_progress p
      where p.user_id = uid and p.fact_id is distinct from v_plan.fact_id order by random() limit 1;
    if v_fid is not null and public._add_fact_item(s.id, v_idx, v_fid, 0) then v_idx := v_idx + 1; end if;

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

-- ───────────────────────── finish a session ─────────────────────────
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
    -- 5 per correct answer; the +10 finish bonus needs 60% right; +15 for a perfect score.
    v_xp := public.award_xp(s.user_id, 'quiz', s.quiz_date::text,
      v_score * 5
      + case when v_score >= ceil(v_total * 0.6) then 10 else 0 end
      + case when v_passed then 15 else 0 end);

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

-- ───────────────────────── answer a question ─────────────────────────
create or replace function public.answer_quiz(p_session uuid, p_idx int, p_answer text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.quiz_sessions%rowtype;
  it public.quiz_session_items%rowtype;
  v_answered int;
  v_total int;
  v_prev timestamptz;
  v_correct boolean;
  v_result jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into s from public.quiz_sessions where id = p_session and user_id = uid for update;
  if not found then raise exception 'Quiz not found'; end if;
  if s.finished_at is not null then raise exception 'Quiz already finished'; end if;
  if s.expires_at <= now() then raise exception 'Quiz expired'; end if;

  select count(*) filter (where answer is not null), count(*), max(answered_at)
    into v_answered, v_total, v_prev from public.quiz_session_items where session_id = s.id;
  if p_idx <> v_answered then raise exception 'Answer the questions in order'; end if;
  -- Nobody reads and answers a question in under two seconds; this stops scripted click-through.
  if now() - coalesce(v_prev, s.created_at) < interval '2 seconds' then raise exception 'too_fast'; end if;

  select * into it from public.quiz_session_items where session_id = s.id and idx = p_idx;
  if not (it.options ? p_answer) then raise exception 'Not one of the options'; end if;

  v_correct := (p_answer = it.correct);
  update public.quiz_session_items set answer = p_answer, is_correct = v_correct, answered_at = now()
    where session_id = s.id and idx = p_idx;

  if v_answered + 1 >= v_total then
    v_result := public._finish_session(s.id);
  end if;

  return jsonb_build_object('correct', v_correct, 'correct_answer', it.correct,
                            'done', v_answered + 1 >= v_total, 'result', v_result);
end $$;

revoke execute on function public.start_quiz(text, uuid) from public, anon;
revoke execute on function public.answer_quiz(uuid, int, text) from public, anon;
grant execute on function public.start_quiz(text, uuid) to authenticated;
grant execute on function public.answer_quiz(uuid, int, text) to authenticated;

-- ───────────────────────── sync_xp: only verified inputs ─────────────────────────
-- Quiz XP is now awarded when the graded session finishes, so it is gone from here.
-- Streak badges count days with a *passed* quiz (not the client-writable users.current_streak).
-- Topic badges need a correctly answered quiz question on a fact, not just opening it.
-- Reviews count only correctly answered review questions.
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

  for b in select * from public.badges
           where key not in (select badge_key from public.user_badges where user_id = uid) loop
    cnt := case b.kind
      when 'streak' then (
        select coalesce(max(run), 0) from (
          select count(*) as run from (
            select activity_date - (row_number() over (order by activity_date))::int as grp
            from public.user_activity_log
            where user_id = uid and quiz_completed and (quiz_perfect or quiz_score >= 3)
          ) d group by grp
        ) r)
      when 'words' then (select count(*) from public.user_word_progress where user_id = uid and marked_known)
      when 'quizzes' then (select count(*) from public.user_activity_log where user_id = uid and quiz_completed and (quiz_perfect or quiz_score >= 3))
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
