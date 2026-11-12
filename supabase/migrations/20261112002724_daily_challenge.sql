create table if not exists public.daily_challenges (
  challenge_date date primary key,
  number int not null,
  prompts jsonb not null,
  created_at timestamptz not null default now()
);
-- Correct answers live apart from the prompts so clients can never read them.
create table if not exists public.daily_challenge_keys (
  challenge_date date not null references public.daily_challenges(challenge_date) on delete cascade,
  idx int not null,
  correct text not null,
  primary key (challenge_date, idx)
);
create table if not exists public.daily_challenge_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null references public.daily_challenges(challenge_date) on delete cascade,
  idx int not null,
  answer text not null,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (user_id, challenge_date, idx)
);
alter table public.daily_challenges enable row level security;
alter table public.daily_challenge_keys enable row level security;
alter table public.daily_challenge_answers enable row level security;
create policy "Users read own challenge answers" on public.daily_challenge_answers for select using (auth.uid() = user_id);
-- daily_challenges / daily_challenge_keys: no client policies; access is through the functions below.

-- Same 5 questions for everyone on a given (UTC) day, picked deterministically from the word bank.
create or replace function public._ensure_daily_challenge(p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare w record; i int := 0; opts text[]; v_prompts jsonb := '[]'::jsonb; v_keys text[] := '{}';
begin
  perform pg_advisory_xact_lock(hashtext('daily_challenge_' || p_date::text));
  if exists (select 1 from public.daily_challenges where challenge_date = p_date) then return; end if;
  for w in
    select id, word, definition from (
      select distinct on (lower(word)) id, word, definition from public.words order by lower(word), id
    ) d order by md5(p_date::text || id::text) limit 5
  loop
    select array_agg(word) into opts from (
      select word from (
        select distinct on (lower(word)) id, word from public.words where lower(word) <> lower(w.word) order by lower(word), id
      ) x order by md5(p_date::text || 'd' || id::text) limit 3
    ) y;
    opts := opts || w.word;
    v_prompts := v_prompts || jsonb_build_array(jsonb_build_object(
      'question', 'Which word means "' || w.definition || '"?',
      'options', to_jsonb((select array_agg(o order by md5(p_date::text || o)) from unnest(opts) o))));
    v_keys := array_append(v_keys, w.word);
  end loop;
  insert into public.daily_challenges (challenge_date, number, prompts)
    values (p_date, (p_date - date '2026-11-12') + 1, v_prompts);
  for i in 1..coalesce(array_length(v_keys, 1), 0) loop
    insert into public.daily_challenge_keys (challenge_date, idx, correct) values (p_date, i - 1, v_keys[i]);
  end loop;
end $$;
revoke execute on function public._ensure_daily_challenge(date) from public, anon, authenticated;

create or replace function public._challenge_streak(p_user uuid, p_today date)
returns int language plpgsql stable security definer set search_path = public as $$
declare v_streak int := 0; d date;
begin
  d := case when (select count(*) from public.daily_challenge_answers where user_id = p_user and challenge_date = p_today) >= 5
            then p_today else p_today - 1 end;
  while (select count(*) from public.daily_challenge_answers where user_id = p_user and challenge_date = d) >= 5 loop
    v_streak := v_streak + 1;
    d := d - 1;
  end loop;
  return v_streak;
end $$;
revoke execute on function public._challenge_streak(uuid, date) from public, anon, authenticated;

create or replace function public.get_daily_challenge()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_date date := (now() at time zone 'utc')::date;
  c public.daily_challenges%rowtype;
  v_answered int; v_score int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform public._ensure_daily_challenge(v_date);
  select * into c from public.daily_challenges where challenge_date = v_date;
  select count(*), count(*) filter (where correct) into v_answered, v_score
    from public.daily_challenge_answers where user_id = uid and challenge_date = v_date;
  return jsonb_build_object(
    'date', v_date,
    'number', c.number,
    'total', jsonb_array_length(c.prompts),
    'questions', (select coalesce(jsonb_agg(jsonb_build_object('index', t.i - 1, 'question', t.q->>'question', 'options', t.q->'options') order by t.i), '[]'::jsonb)
                  from jsonb_array_elements(c.prompts) with ordinality as t(q, i)),
    'answers', (select coalesce(jsonb_agg(jsonb_build_object('index', a.idx, 'answer', a.answer, 'correct', a.correct, 'correct_answer', k.correct) order by a.idx), '[]'::jsonb)
                from public.daily_challenge_answers a
                join public.daily_challenge_keys k on k.challenge_date = a.challenge_date and k.idx = a.idx
                where a.user_id = uid and a.challenge_date = v_date),
    'answered', v_answered,
    'score', v_score,
    'completed', v_answered >= jsonb_array_length(c.prompts),
    'streak', public._challenge_streak(uid, v_date)
  );
end $$;

create or replace function public.submit_challenge_answer(p_index int, p_answer text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_date date := (now() at time zone 'utc')::date;
  v_total int; v_answered int; v_key text; v_correct boolean; v_score int; v_done boolean;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform public._ensure_daily_challenge(v_date);
  select jsonb_array_length(prompts) into v_total from public.daily_challenges where challenge_date = v_date;
  select count(*) into v_answered from public.daily_challenge_answers where user_id = uid and challenge_date = v_date;
  if v_answered >= v_total then raise exception 'You have already finished today''s challenge'; end if;
  if p_index <> v_answered then raise exception 'Answer the questions in order'; end if;
  select correct into v_key from public.daily_challenge_keys where challenge_date = v_date and idx = p_index;
  v_correct := (p_answer = v_key);
  insert into public.daily_challenge_answers (user_id, challenge_date, idx, answer, correct)
    values (uid, v_date, p_index, p_answer, v_correct);
  v_done := (v_answered + 1) >= v_total;
  select count(*) filter (where correct) into v_score
    from public.daily_challenge_answers where user_id = uid and challenge_date = v_date;
  if v_done then
    -- 10 XP per correct answer, +10 for a perfect score; sync_xp folds it into the user's total.
    insert into public.xp_events (user_id, source, ref_key, amount)
      values (uid, 'challenge', v_date::text, v_score * 10 + case when v_score = v_total then 10 else 0 end)
      on conflict do nothing;
  end if;
  return jsonb_build_object('correct', v_correct, 'correct_answer', v_key, 'completed', v_done, 'score', v_score,
                            'streak', case when v_done then public._challenge_streak(uid, v_date) else null end);
end $$;

revoke execute on function public.get_daily_challenge() from public, anon;
revoke execute on function public.submit_challenge_answer(int, text) from public, anon;
grant execute on function public.get_daily_challenge() to authenticated;
grant execute on function public.submit_challenge_answer(int, text) to authenticated;
