-- Daily Facts, step 1: foundation. Additive only: nothing is dropped, renamed or moved.

-- 1. How many facts a day (1, 3 or 5), per user.
alter table public.user_preferences add column if not exists facts_per_day int not null default 1;
alter table public.user_preferences add constraint user_preferences_facts_per_day_check check (facts_per_day in (1, 3, 5));

-- 2. The day's facts are frozen once built (Lagos day), so reopening the app shows the same ones.
create table public.daily_fact_sets (
  user_id uuid not null references auth.users(id) on delete cascade,
  lagos_date date not null,
  fact_ids uuid[] not null,
  chosen_count int not null,
  recycled boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, lagos_date)
);

-- A fact the user passed Test me on, per Lagos day. Written only by the server; drives the fact quest.
create table public.fact_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  lagos_date date not null,
  fact_id uuid not null references public.facts(id) on delete cascade,
  passed boolean not null default false,
  score int,
  total int,
  created_at timestamptz not null default now(),
  primary key (user_id, lagos_date, fact_id)
);

-- Same lock-out after a missed check as words have (word_check_cooldowns).
create table public.fact_check_cooldowns (
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  retry_available_at timestamptz not null,
  fail_count int not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, fact_id)
);

do $$ declare t text; begin
  foreach t in array array['daily_fact_sets', 'fact_checks', 'fact_check_cooldowns'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Users read own rows" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- 3. Review progress for facts, same columns words have. Server-controlled like the word ones.
alter table public.user_fact_progress
  add column if not exists marked_known boolean not null default false,
  add column if not exists mastery text not null default 'new',
  add column if not exists interval_step int not null default 0,
  add column if not exists due_at timestamptz,
  add column if not exists review_count int not null default 0,
  add column if not exists last_reviewed_at timestamptz;
alter table public.user_fact_progress add constraint user_fact_progress_mastery_check check (mastery in ('new', 'learning', 'mastered'));

create function public._guard_fact_progress() returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.learn_write', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    if new.marked_known or new.mastery <> 'new' or new.interval_step <> 0 or new.due_at is not null
       or new.review_count <> 0 or new.last_reviewed_at is not null then
      raise exception 'Review progress is controlled by the server';
    end if;
  elsif (new.marked_known, new.mastery, new.interval_step, new.due_at, new.review_count, new.last_reviewed_at)
        is distinct from (old.marked_known, old.mastery, old.interval_step, old.due_at, old.review_count, old.last_reviewed_at) then
    raise exception 'Review progress is controlled by the server';
  end if;
  return new;
end $$;
create trigger guard_fact_progress before insert or update on public.user_fact_progress
  for each row execute function public._guard_fact_progress();

-- 4. Saved words and facts through one door. Option A: the two tables stay where they are
--    (each is unique on user + item), this view and function sit on top. RLS applies as the caller.
create view public.saved_items with (security_invoker = true) as
  select user_id, 'word'::text as item_type, word_id as item_id, first_seen_at as added_at,
         due_at, mastery, interval_step, last_reviewed_at
  from public.user_word_progress where saved
  union all
  select user_id, 'fact'::text, fact_id, seen_at, due_at, mastery, interval_step, last_reviewed_at
  from public.user_fact_progress where saved;
revoke all on public.saved_items from anon, authenticated;
grant select on public.saved_items to authenticated;

create function public.set_item_saved(p_type text, p_id uuid, p_saved boolean) returns boolean
language plpgsql set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_type = 'word' then
    insert into public.user_word_progress (user_id, word_id, saved) values (uid, p_id, p_saved)
    on conflict (user_id, word_id) do update set saved = excluded.saved;
  elsif p_type = 'fact' then
    insert into public.user_fact_progress (user_id, fact_id, saved) values (uid, p_id, p_saved)
    on conflict (user_id, fact_id) do update set saved = excluded.saved;
  else
    raise exception 'Bad item type';
  end if;
  return p_saved; -- saving never awards XP
end $$;
revoke all on function public.set_item_saved(text, uuid, boolean) from public, anon;
grant execute on function public.set_item_saved(text, uuid, boolean) to authenticated;

-- 5. XP config: a start date and a shared daily cap per group, both read from config.
alter table public.xp_rules add column if not exists effective_from timestamptz;
alter table public.xp_rules add column if not exists cap_group text;
insert into public.xp_settings (key, value) values ('cap_fact', to_jsonb(15)) on conflict (key) do nothing;

insert into public.xp_rules (rule, ledger_source, amount, amount_from_ctx, per, counts_toward_ceiling, needs_timing, enabled, description, effective_from, cap_group) values
  ('fact_learn', 'fact_learn', 3, false, 'day', true, true, true, 'Test me passed on a fact in today''s set: once per fact per day', '2026-11-23 00:00:00+01', 'fact'),
  ('fact_quiz_correct', 'fact_quiz', 1, false, 'day', true, true, true, 'Fact Test me: per correct answer, once per question per day', '2026-11-23 00:00:00+01', 'fact'),
  ('quest_learn_facts', 'quest', 5, false, 'day', true, false, true, 'Learn today''s facts quest: once per day, flat whatever the count', '2026-11-23 00:00:00+01', null);

create function public._xp_rule_amount(p_rule text) returns int language sql stable set search_path = public as $$
  select case when r.enabled and (r.effective_from is null or now() >= r.effective_from) then r.amount else 0 end
  from public.xp_rules r where r.rule = p_rule
$$;
revoke all on function public._xp_rule_amount(text) from public, anon, authenticated;

-- _award: honour effective_from (silently pays 0 before it) and the group cap.
create or replace function public._award(p_uid uuid, p_rule text, p_ref text, p_ctx jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.xp_rules%rowtype;
  v_day date := public._lagos_today();
  v_amt int; v_paid int; v_used int; v_full int; v_half int; v_key text; v_id uuid; v_grp_used int; v_grp_cap int;
  v_h jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
  if p_uid is null then raise exception 'No user'; end if;
  perform pg_advisory_xact_lock(hashtextextended('xp:' || p_uid::text, 0));

  select * into r from public.xp_rules where rule = p_rule;
  if not found or not r.enabled then
    return public._xp_reject(p_uid, coalesce(r.ledger_source, p_rule), p_ref, 'rule_disabled');
  end if;
  if r.effective_from is not null and now() < r.effective_from then
    return jsonb_build_object('awarded', 0, 'reason', 'not_active'); -- not live yet: pays nothing, logs nothing
  end if;

  v_amt := case when r.amount_from_ctx then least(coalesce((p_ctx ->> 'amount')::int, 0), r.amount) else r.amount end;
  if v_amt <= 0 then return jsonb_build_object('awarded', 0, 'reason', 'no_xp'); end if;

  v_key := case r.per when 'day' then v_day::text || ':' || p_ref else p_ref end;
  if exists (select 1 from public.xp_events where user_id = p_uid and source = r.ledger_source and ref_key = v_key) then
    return public._xp_reject(p_uid, r.ledger_source, v_key, 'already_awarded');
  end if;

  if r.cap_group is not null then
    v_grp_cap := public._xp_cfg('cap_' || r.cap_group)::int;
    select coalesce(sum(e.amount), 0) into v_grp_used from public.xp_events e
      where e.user_id = p_uid and e.lagos_day = v_day
        and e.source in (select ledger_source from public.xp_rules where cap_group = r.cap_group);
    if v_grp_used >= v_grp_cap then
      return public._xp_reject(p_uid, r.ledger_source, v_key, r.cap_group || '_cap', jsonb_build_object('used', v_grp_used));
    end if;
    v_amt := least(v_amt, v_grp_cap - v_grp_used);
  end if;

  v_paid := v_amt;
  if r.counts_toward_ceiling then
    v_full := public._xp_cfg('ceiling_full')::int;
    v_half := public._xp_cfg('ceiling_half')::int;
    v_used := public._xp_today(p_uid);
    if v_used >= v_half then
      return public._xp_reject(p_uid, r.ledger_source, v_key, 'daily_ceiling', jsonb_build_object('used', v_used));
    elsif v_used + v_amt > v_full then
      v_paid := greatest(v_full - v_used, 0) + floor((v_amt - greatest(v_full - v_used, 0)) / 2.0)::int;
      v_paid := least(greatest(v_paid, 1), v_half - v_used);
    end if;
  end if;

  insert into public.xp_events (user_id, source, ref_key, amount) values (p_uid, r.ledger_source, v_key, v_paid)
  on conflict do nothing returning id into v_id;
  if v_id is null then return public._xp_reject(p_uid, r.ledger_source, v_key, 'already_awarded'); end if;

  insert into public.xp_event_meta (event_id, user_id, source, item_id, session_id, time_to_answer_ms, is_correct, device_hash, ip_hash)
  values (v_id, p_uid, r.ledger_source, nullif(p_ctx ->> 'item_id', ''), nullif(p_ctx ->> 'session_id', '')::uuid,
          nullif(p_ctx ->> 'time_ms', '')::int, nullif(p_ctx ->> 'is_correct', '')::boolean,
          public._xp_hash(v_h ->> 'x-device-id'),
          public._xp_hash(coalesce(v_h ->> 'cf-connecting-ip', split_part(coalesce(v_h ->> 'x-forwarded-for', ''), ',', 1))));

  return jsonb_build_object('awarded', v_paid, 'requested', v_amt, 'reason', case when v_paid < v_amt then 'halved' end);
end $$;
revoke all on function public._award(uuid, text, text, jsonb) from public, anon, authenticated;
