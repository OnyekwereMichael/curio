-- Daily Facts, step 2: the question bank. Pre-authored questions with explanations, validated by the database.
-- Nothing is served until a row is status = 'approved'. Until then the existing question builders keep working.

create table public.quiz_bank (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('word', 'fact')),
  item_id uuid not null,
  style text not null check (style in ('application', 'not_true', 'near_miss', 'compare', 'fill_blank', 'recall')),
  question text not null,
  correct text not null,
  wrong text[] not null,
  explanation text not null,
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  source text not null default 'claude_draft',
  problems text[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (item_type, item_id, question)
);
create index quiz_bank_item_idx on public.quiz_bank (item_type, item_id, status);
alter table public.quiz_bank enable row level security; -- no policies: the correct answers never leave the server
revoke all on public.quiz_bank from anon, authenticated;

-- ── automated checks ──
create function public._qb_norm(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', ' ', 'g')) $$;

create function public._qb_tokens(t text) returns text[] language sql immutable as $$
  select coalesce(array(select distinct x from unnest(string_to_array(public._qb_norm(t), ' ')) x where x <> ''), '{}') $$;

create function public._qb_jaccard(a text, b text) returns numeric language sql immutable as $$
  select case when cardinality(ta) = 0 or cardinality(tb) = 0 then 0 else
    (select count(*) from (select unnest(ta) intersect select unnest(tb)) i)::numeric /
    (select count(*) from (select unnest(ta) union select unnest(tb)) u) end
  from (select public._qb_tokens(a) ta, public._qb_tokens(b) tb) z $$;

create function public._quiz_bank_problems(p_type text, p_item uuid, p_q text, p_correct text, p_wrong text[], p_expl text)
returns text[] language plpgsql stable set search_path = public as $$
declare
  opts text[]; p text[] := '{}'; i int; j int; sig text[]; shares int; maxwrong int;
  stop text[] := array['which','what','their','there','these','those','about','would','could','should','while','where','after',
                       'before','because','being','other','people','something','someone','statement','following','sentence','best'];
begin
  if coalesce(cardinality(p_wrong), 0) <> 3 then p := array_append(p, 'wrong_count'::text); end if;
  if btrim(coalesce(p_q, '')) = '' or btrim(coalesce(p_correct, '')) = '' then p := array_append(p, 'empty'::text); end if;
  if length(coalesce(p_expl, '')) < 10 or length(coalesce(p_expl, '')) > 300 then p := array_append(p, 'explanation_length'::text); end if;
  if (p_type = 'word' and not exists (select 1 from public.words where id = p_item))
     or (p_type = 'fact' and not exists (select 1 from public.facts where id = p_item)) then p := array_append(p, 'no_item'::text); end if;

  if coalesce(cardinality(p_wrong), 0) = 3 then
    opts := p_wrong || p_correct;
    for i in 1..4 loop
      for j in i + 1..4 loop
        if public._qb_norm(opts[i]) = public._qb_norm(opts[j]) then p := array_append(p, 'duplicate_option'::text);
        elsif public._qb_jaccard(opts[i], opts[j]) >= 0.8 then p := array_append(p, 'near_duplicate_option'::text);
        end if;
      end loop;
    end loop;
    -- the answer must not be findable by matching a word from the question
    sig := array(select x from unnest(public._qb_tokens(p_q)) x where length(x) >= 5 and not x = any(stop));
    select count(*) into shares from unnest(p_wrong) w where public._qb_tokens(w) && sig;
    if public._qb_tokens(p_correct) && sig and shares = 0 then p := array_append(p, 'matching_word_giveaway'::text); end if;
    select max(length(w)) into maxwrong from unnest(p_wrong) w;
    if length(p_correct) > 40 and length(p_correct) > 1.8 * maxwrong then p := array_append(p, 'longest_answer_tell'::text); end if;
  end if;
  if length(public._qb_norm(p_correct)) >= 4 and position(public._qb_norm(p_correct) in public._qb_norm(p_q)) > 0 then
    p := array_append(p, 'answer_in_question'::text);
  end if;
  return coalesce((select array_agg(distinct x order by x) from unnest(p) x), '{}');
end $$;

create function public._quiz_bank_check() returns trigger language plpgsql set search_path = public as $$
begin
  new.problems := public._quiz_bank_problems(new.item_type, new.item_id, new.question, new.correct, new.wrong, new.explanation);
  if new.status = 'approved' and cardinality(new.problems) > 0 then
    raise exception 'Cannot approve: %', array_to_string(new.problems, ', ');
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then new.reviewed_at := now(); end if;
  return new;
end $$;
create trigger quiz_bank_check before insert or update on public.quiz_bank
  for each row execute function public._quiz_bank_check();

-- ── serving ──
alter table public.quiz_session_items add column if not exists explanation text;
alter table public.quiz_session_items add column if not exists bank_id uuid;
alter table public.quiz_sessions add column if not exists fact_id uuid references public.facts(id) on delete cascade;

-- One approved question for an item, least-asked first, options shuffled now. False when none is approved.
create function public._add_bank_item(p_session uuid, p_idx int, p_type text, p_item uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare b public.quiz_bank%rowtype;
begin
  select * into b from public.quiz_bank qb
  where qb.item_type = p_type and qb.item_id = p_item and qb.status = 'approved'
    and qb.id not in (select bank_id from public.quiz_session_items where session_id = p_session and bank_id is not null)
  order by (select count(*) from public.quiz_session_items x join public.quiz_sessions qs on qs.id = x.session_id
            where qs.user_id = auth.uid() and x.bank_id = qb.id), random()
  limit 1;
  if not found then return false; end if;
  insert into public.quiz_session_items (session_id, idx, kind, word_id, fact_id, prompt, options, correct, explanation, bank_id)
  values (p_session, p_idx, p_type, case when p_type = 'word' then p_item end, case when p_type = 'fact' then p_item end,
          b.question, (select jsonb_agg(o order by random()) from unnest(b.wrong || b.correct) o), b.correct, b.explanation, b.id);
  return true;
end $$;
revoke all on function public._add_bank_item(uuid, int, text, uuid) from public, anon, authenticated;

-- Word and fact items try the bank first. The two live builders are patched in place (one line added,
-- the rest of each function is left exactly as it is) and fall back to their original questions.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public._add_word_item(uuid,integer,uuid,text)'::regprocedure);
  if position('_add_bank_item' in d) = 0 then
    n := replace(d, E'begin
  select * into w', E'begin
  if public._add_bank_item(p_session, p_idx, ''word'', p_word) then return true; end if;
  select * into w');
    if n = d then raise exception 'could not patch _add_word_item'; end if;
    execute n;
  end if;

  d := pg_get_functiondef('public._add_fact_item(uuid,integer,uuid,integer)'::regprocedure);
  if position('_add_bank_item' in d) = 0 then
    n := replace(d, E'begin
  select quiz_questions', E'begin
  if public._add_bank_item(p_session, p_idx, ''fact'', p_fact) then return true; end if;
  select quiz_questions');
    if n = d then raise exception 'could not patch _add_fact_item'; end if;
    execute n;
  end if;
end $$;

-- A fact can be tested when two approved bank questions or two original questions exist.
create function public._fact_testable(p_fact uuid) returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from public.quiz_bank where item_type = 'fact' and item_id = p_fact and status = 'approved') >= 2
      or coalesce((select jsonb_array_length(quiz_questions) from public.facts where id = p_fact), 0) >= 2 $$;
revoke all on function public._fact_testable(uuid) from public, anon, authenticated;

-- The explanation comes back with the grade, after the answer is locked in, never before.
create or replace function public._answer_quiz(p_session uuid, p_idx integer, p_answer text, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.quiz_sessions%rowtype; it public.quiz_session_items%rowtype;
  v_answered int; v_total int; v_prev timestamptz; v_correct boolean; v_result jsonb; v_ms int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into s from public.quiz_sessions where id = p_session and user_id = uid for update;
  if not found then raise exception 'Quiz not found'; end if;
  if s.finished_at is not null then raise exception 'Quiz already finished'; end if;
  if s.expires_at <= now() then raise exception 'Quiz expired'; end if;

  select count(*) filter (where answer is not null), count(*), max(answered_at)
    into v_answered, v_total, v_prev from public.quiz_session_items where session_id = s.id;
  if p_idx <> v_answered then
    return public._xp_reject(uid, 'quiz', s.id::text || ':' || p_idx, 'replay_or_out_of_order') || jsonb_build_object('rejected', true);
  end if;
  if now() - coalesce(v_prev, s.created_at) < interval '2 seconds' then raise exception 'too_fast'; end if;

  select * into it from public.quiz_session_items where session_id = s.id and idx = p_idx;
  if p_token is distinct from it.token and (p_token is not null or public._xp_flag('require_question_token')) then
    return public._xp_reject(uid, 'quiz', s.id::text || ':' || p_idx, 'bad_token') || jsonb_build_object('rejected', true);
  end if;
  if not (it.options ? p_answer) then raise exception 'Not one of the options'; end if;

  v_correct := (p_answer = it.correct);
  v_ms := (extract(epoch from (now() - coalesce(v_prev, s.created_at))) * 1000)::int;
  update public.quiz_session_items set answer = p_answer, is_correct = v_correct, answered_at = now(), time_ms = v_ms
    where session_id = s.id and idx = p_idx;

  if v_answered + 1 >= v_total then v_result := public._finish_session(s.id); end if;

  return jsonb_build_object('correct', v_correct, 'correct_answer', it.correct, 'explanation', it.explanation,
                            'done', v_answered + 1 >= v_total, 'result', v_result);
end $$;
