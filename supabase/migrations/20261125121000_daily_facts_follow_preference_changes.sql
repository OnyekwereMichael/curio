-- get_daily_facts froze the day's set the first time it was built, so raising/lowering "facts per day" in Settings
-- did nothing until tomorrow. Re-fit today's set to the current preference: shrink keeps the first N,
-- grow keeps what is there and appends new picks (same ranking as a fresh build).
do $$
declare d text; n text;
  sig regprocedure := 'public.get_daily_facts()'::regprocedure;
  anchor text := E'  return jsonb_build_object(\n    ''date'', st.lagos_date,';
  blk text := E'  if cardinality(st.fact_ids) > v_n then
    update public.daily_fact_sets set fact_ids = st.fact_ids[1:v_n], chosen_count = v_n
      where user_id = uid and lagos_date = v_day;
    select * into st from public.daily_fact_sets where user_id = uid and lagos_date = v_day;
  elsif cardinality(st.fact_ids) < v_n and st.chosen_count < v_n then
    select coalesce(array_agg(id), ''{}'') into v_more from (
      select f.id from public.facts f
      where (f.publish_date is null or f.publish_date <= v_utc) and public._fact_testable(f.id) and f.id <> all (st.fact_ids)
      order by
        (exists (select 1 from public.user_fact_progress p where p.user_id = uid and p.fact_id = f.id)
         or exists (select 1 from public.daily_fact_sets s where s.user_id = uid and f.id = any(s.fact_ids))),
        (cardinality(v_topics) = 0 or f.topic = any(v_topics)) desc,
        coalesce((select p.seen_at from public.user_fact_progress p where p.user_id = uid and p.fact_id = f.id), ''epoch''::timestamptz),
        md5(uid::text || v_day::text || f.id::text)
      limit v_n - cardinality(st.fact_ids)
    ) x;
    update public.daily_fact_sets set fact_ids = st.fact_ids || v_more, chosen_count = v_n
      where user_id = uid and lagos_date = v_day;
    insert into public.user_fact_progress (user_id, fact_id, seen_at)
      select uid, x, now() from unnest(v_more) x on conflict (user_id, fact_id) do nothing;
    select * into st from public.daily_fact_sets where user_id = uid and lagos_date = v_day;
  elsif st.chosen_count <> v_n and cardinality(st.fact_ids) <= v_n then
    update public.daily_fact_sets set chosen_count = v_n where user_id = uid and lagos_date = v_day;
  end if;

';
begin
  d := pg_get_functiondef(sig);
  if position('fact_ids = st.fact_ids[1:v_n]' in d) > 0 then return; end if; -- already applied
  n := replace(d, anchor, blk || anchor);
  if n = d then raise exception 'patch anchor not found in get_daily_facts'; end if;
  execute n;
end $$;
