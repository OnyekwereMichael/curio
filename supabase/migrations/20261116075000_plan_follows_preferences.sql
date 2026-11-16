-- Changing "words per day" or "fact topics" in Settings did nothing for the rest of the day: the daily
-- plan is built once and get_or_build_daily_plan only rebuilt it when it predated onboarding.
--
-- Now an existing plan is re-fitted to the user's current preferences on every read:
--   * words: fewer wanted -> keep the first N (the ones already shown stay put);
--            more wanted  -> keep what is there and append new picks (same ranking as a fresh build).
--   * fact:  if the user picked topics and today's fact is outside them, swap in one from their topics.
-- Words/facts the user already saw today are never reshuffled just because an unrelated setting
-- (reminder time, weekly goal...) was saved.

create or replace function public.get_or_build_daily_plan(p_date date default ((now() at time zone 'utc'))::date)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  prefs public.user_preferences%rowtype;
  plan public.daily_plans%rowtype;
  v_n int := 1;
  v_style text;
  v_level text;
  v_word_ids uuid[];
  v_extra_ids uuid[];
  v_fact_id uuid;
  v_fact_topic text;
  personalised boolean;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select * into prefs from public.user_preferences where user_id = uid;
  personalised := found and prefs.onboarded_at is not null;

  if personalised then
    v_n := prefs.words_per_day;
    v_style := case lower(coalesce(prefs.word_style, ''))
      when 'everyday words' then 'everyday'
      when 'business and professional' then 'business'
      when 'exam prep' then 'exam'
      when E'writer\'s toolkit' then 'writer'
      else null end;
    v_level := lower(prefs.level);
  end if;

  select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;

  -- Build (or rebuild an untouched plan that predates onboarding finishing).
  if not found or (personalised and plan.completed_at is null and plan.created_at < prefs.onboarded_at) then
    if personalised then
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

  if personalised then
    -- Words per day changed: shrink or top up the existing plan.
    if cardinality(plan.word_ids) > v_n then
      update public.daily_plans set word_ids = plan.word_ids[1:v_n]
      where user_id = uid and plan_date = p_date;
      select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;
    elsif cardinality(plan.word_ids) < v_n then
      select coalesce(array_agg(id order by rn), '{}') into v_extra_ids from (
        select id, row_number() over () rn from (
          select distinct on (lower(w.word)) w.id, w.publish_date,
            (not exists (select 1 from public.user_word_progress p where p.user_id = uid and p.word_id = w.id)) as unseen,
            (v_style is null or w.styles is null or v_style = any(w.styles)) as style_ok,
            (v_level is null or w.level is null or w.level = v_level) as level_ok,
            (w.publish_date = p_date) as is_today,
            md5(uid::text || p_date::text || w.id::text) as h
          from public.words w
          where (w.publish_date is null or w.publish_date <= p_date)
            and not (w.id = any(plan.word_ids))
            and lower(w.word) not in (select lower(x.word) from public.words x where x.id = any(plan.word_ids))
          order by lower(w.word), w.publish_date desc nulls last
        ) d
        order by unseen desc, style_ok desc, level_ok desc, is_today desc, h
        limit (v_n - cardinality(plan.word_ids))
      ) picked;

      if cardinality(v_extra_ids) > 0 then
        update public.daily_plans set word_ids = plan.word_ids || v_extra_ids
        where user_id = uid and plan_date = p_date;
        select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;
      end if;
    end if;

    -- Fact topics changed: today's fact must come from the chosen topics.
    if cardinality(prefs.fact_topics) > 0 then
      select topic into v_fact_topic from public.facts where id = plan.fact_id;
      if plan.fact_id is null or v_fact_topic is null or not (v_fact_topic = any(prefs.fact_topics)) then
        select f.id into v_fact_id
        from public.facts f
        where (f.publish_date is null or f.publish_date <= p_date)
          and f.topic = any(prefs.fact_topics)
        order by
          (not exists (select 1 from public.user_fact_progress p where p.user_id = uid and p.fact_id = f.id)) desc,
          (f.publish_date = p_date) desc,
          md5(uid::text || p_date::text || f.id::text)
        limit 1;
        if v_fact_id is not null then
          update public.daily_plans set fact_id = v_fact_id where user_id = uid and plan_date = p_date;
          select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;
        end if;
      end if;
    end if;
  end if;

  -- The plan was saved while no fact was available: pick one now (same rules), leaving the words alone.
  if plan.fact_id is null then
    if personalised then
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
      select id into v_fact_id from public.facts where publish_date = p_date limit 1;
    end if;
    if v_fact_id is not null then
      update public.daily_plans set fact_id = v_fact_id where user_id = uid and plan_date = p_date and fact_id is null;
      select * into plan from public.daily_plans where user_id = uid and plan_date = p_date;
    end if;
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
end $function$;
