insert into public.xp_events (user_id, source, ref_key, amount, created_at)
select user_id, 'quiz', activity_date::text,
       coalesce(quiz_score, 0) * 5 + 10 + case when coalesce(quiz_perfect, false) then 15 else 0 end,
       activity_date::timestamptz
from public.user_activity_log
where quiz_completed and user_id in (select id from auth.users)
on conflict do nothing;

select set_config('app.xp_write', 'on', true);
update public.users u set
  total_xp = s.xp,
  level = floor((1 + sqrt(1 + 4.0 * s.xp / 25)) / 2)::int
from (select user_id, sum(amount)::int xp from public.xp_events group by user_id) s
where u.id = s.user_id;
