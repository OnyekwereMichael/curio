-- 1. Tag columns + let words/facts live in a pool (publish_date optional).
alter table public.words add column if not exists styles text[];
alter table public.words add column if not exists level text;
alter table public.words alter column publish_date drop not null;
alter table public.facts add column if not exists topic text;
alter table public.facts alter column publish_date drop not null;

-- 2. Level tags (editable later; stored lowercase).
update public.words set level = case
  when word in ('Authentic','Versatile','Resourceful','Overwhelmed','Savvy','Gracious','Frugal','Abundant','Concise','Itinerary','Succulent','Reluctant','Wanderlust','Insightful','Intuitive','Spontaneous','Compelling','Procrastinate','Assertive','Skeptical','Resilient','Pizzazz','Hodgepodge','Topsy-turvy','Rambunctious','Inevitable','Nostalgia','Cynical') then 'beginner'
  when word in ('Mellifluous','Petrichor','Sonder','Ostensibly','Capricious','Juxtapose','Austere','Tenuous','Disparate','Ephemeral') then 'advanced'
  else 'intermediate' end
where level is null;

-- 3. Style tags. A word can fit several styles.
update public.words w set styles = (
  select coalesce(array_agg(s), array['everyday']) from (
    select 'everyday' s where w.word in ('Overwhelmed','Procrastinate','Savvy','Frugal','Gracious','Reluctant','Itinerary','Succulent','Abundant','Hodgepodge','Topsy-turvy','Rambunctious','Resilient','Spontaneous','Authentic','Skeptical','Cynical','Assertive','Validate','Nostalgia','Wanderlust','Intuitive','Insightful','Concise','Apprehensive','Inevitable','Alleviate','Versatile','Resourceful','Pizzazz','Charismatic','Perceptive','Sonder','Petrichor','Serendipity','Ubiquitous')
    union all select 'business' where w.word in ('Leverage','Pragmatic','Paradigm','Lucrative','Assertive','Resourceful','Meticulous','Concise','Validate','Impartial','Obsolete','Versatile','Savvy','Procrastinate','Frugal','Perceptive','Tenacity','Resilient','Itinerary','Ostensibly','Vigilant','Disparate','Authentic','Nuanced','Charismatic','Compelling')
    union all select 'exam' where w.word in ('Ubiquitous','Meticulous','Ephemeral','Pragmatic','Tenuous','Paradigm','Impartial','Ambivalent','Juxtapose','Austere','Capricious','Disparate','Ostensibly','Obsolete','Lucrative','Alleviate','Inevitable','Apprehensive','Nuanced','Skeptical','Cynical','Eloquent','Vigilant','Intricate','Perceptive','Mellifluous','Tenacity','Reluctant','Abundant','Concise','Serendipity')
    union all select 'writer' where w.word in ('Serendipity','Ephemeral','Mellifluous','Sonder','Petrichor','Wanderlust','Eloquent','Nostalgia','Nuanced','Intricate','Juxtapose','Austere','Capricious','Succulent','Pizzazz','Hodgepodge','Topsy-turvy','Rambunctious','Compelling','Insightful','Charismatic','Tenuous','Apprehensive','Ambivalent')
  ) t
) where styles is null;

-- 4. Fact topics, mapped onto the onboarding topic names.
update public.facts set topic = case lower(category)
  when 'science' then 'Science'
  when 'animal' then 'Animals'
  when 'animals' then 'Animals'
  when 'history' then 'History'
  when 'food' then 'Food'
  when 'everyday objects' then 'Technology'
  when 'space' then 'Space'
  when 'human body' then 'Health and body'
  when 'language' then 'Language'
  else null end
where topic is null;

-- 5. One plan per user per day.
create table if not exists public.daily_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  word_ids uuid[] not null default '{}',
  fact_id uuid references public.facts(id) on delete set null,
  quiz_ids jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);
alter table public.daily_plans enable row level security;
create policy "Users read own plans" on public.daily_plans for select using (auth.uid() = user_id);
create policy "Users insert own plans" on public.daily_plans for insert with check (auth.uid() = user_id);
create policy "Users update own plans" on public.daily_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Builds (once per day) and returns the signed-in user's plan.
-- Users without a finished onboarding get exactly the old behaviour:
-- the single word/fact whose publish_date is today.
create or replace function public.get_or_build_daily_plan(p_date date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prefs public.user_preferences%rowtype;
  plan public.daily_plans%rowtype;
  v_n int := 1;
  v_style text;
  v_level text;
  v_word_ids uuid[];
  v_fact_id uuid;
  personalised boolean;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select * into prefs from public.user_preferences where user_id = uid;
  personalised := found and prefs.onboarded_at is not null;

  select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;

  -- Rebuild an untouched plan that predates onboarding finishing (e.g. built moments before).
  if not found or (personalised and plan.completed_at is null and plan.created_at < prefs.onboarded_at) then
    if personalised then
      v_n := prefs.words_per_day;
      v_style := case lower(coalesce(prefs.word_style, ''))
        when 'everyday words' then 'everyday'
        when 'business and professional' then 'business'
        when 'exam prep' then 'exam'
        when E'writer\'s toolkit' then 'writer'
        else null end;
      v_level := lower(prefs.level);

      select coalesce(array_agg(id order by rn), '{}') into v_word_ids from (
        select id, row_number() over () rn from (
          select distinct on (lower(w.word)) w.id, w.publish_date,
            (not exists (select 1 from public.user_word_progress p where p.user_id = uid and p.word_id = w.id)) as unseen,
            (v_style is null or w.styles is null or v_style = any(w.styles)) as style_ok,
            (v_level is null or w.level is null or w.level = v_level) as level_ok,
            (w.publish_date = p_date) as is_today,
            md5(uid::text || p_date::text || w.id::text) as h
          from public.words w
          where w.publish_date is null or w.publish_date <= p_date
          order by lower(w.word), w.publish_date desc nulls last
        ) d
        order by unseen desc, style_ok desc, level_ok desc, is_today desc, h
        limit v_n
      ) picked;

      select f.id into v_fact_id
      from public.facts f
      where f.publish_date is null or f.publish_date <= p_date
      order by
        (not exists (select 1 from public.user_fact_progress p where p.user_id = uid and p.fact_id = f.id)) desc,
        (cardinality(prefs.fact_topics) = 0 or f.topic = any(prefs.fact_topics)) desc,
        (f.publish_date = p_date) desc,
        md5(uid::text || p_date::text || f.id::text)
      limit 1;
    else
      select coalesce(array_agg(id), '{}') into v_word_ids from public.words where publish_date = p_date;
      select id into v_fact_id from public.facts where publish_date = p_date limit 1;
    end if;

    insert into public.daily_plans (user_id, plan_date, word_ids, fact_id)
    values (uid, p_date, v_word_ids, v_fact_id)
    on conflict (user_id, plan_date) do update
      set word_ids = excluded.word_ids, fact_id = excluded.fact_id, created_at = now()
      where public.daily_plans.completed_at is null;

    select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;
  end if;

  return jsonb_build_object(
    'plan_date', plan.plan_date,
    'completed_at', plan.completed_at,
    'words', coalesce((
      select jsonb_agg(to_jsonb(w) order by t.ord)
      from unnest(plan.word_ids) with ordinality t(id, ord)
      join public.words w on w.id = t.id
    ), '[]'::jsonb),
    'fact', (select to_jsonb(f) from public.facts f where f.id = plan.fact_id)
  );
end $$;

revoke execute on function public.get_or_build_daily_plan(date) from public, anon;
grant execute on function public.get_or_build_daily_plan(date) to authenticated;
