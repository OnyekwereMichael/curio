-- For the daily-word push job: each onboarded user's own words for the day.
-- Runs the real plan builder as that user, so the push names exactly what the
-- app will show. Callable by the service role only.
create or replace function public.notification_plans(p_date date default ((now() at time zone 'utc'))::date)
returns table(user_id uuid, words text[], completed boolean, fact_hook text, fact_image text)
language plpgsql security definer set search_path = public as $$
declare r record; plan jsonb;
begin
  for r in
    select u.id from public.users u
    join public.user_preferences p on p.user_id = u.id
    where p.onboarded_at is not null and u.notifications_enabled and u.notification_token is not null
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', r.id, 'role', 'authenticated')::text, true);
    plan := public.get_or_build_daily_plan(p_date);
    user_id := r.id;
    words := coalesce(array(select w->>'word' from jsonb_array_elements(plan->'words') w), '{}');
    completed := (plan->>'completed_at') is not null;
    fact_hook := plan->'fact'->>'hook_line';
    fact_image := plan->'fact'->>'image_url';
    return next;
  end loop;
  perform set_config('request.jwt.claims', '', true);
end $$;

revoke all on function public.notification_plans(date) from public, anon, authenticated;
grant execute on function public.notification_plans(date) to service_role;
