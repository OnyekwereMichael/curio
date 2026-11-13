-- Pre-launch preview: until competition_start the weekly board shows this week's real XP
-- (so the podium and list are populated). From the start, XP only counts from competition_start.

create or replace function public.get_leaderboard(
  p_period text default 'week',
  p_limit int default 25,
  p_offset int default 0
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.leaderboard_config%rowtype;
  v_week timestamptz := date_trunc('week', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_from timestamptz;
  v_end timestamptz;
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_period not in ('week', 'all') then raise exception 'Invalid period'; end if;
  select * into cfg from public.leaderboard_config limit 1;

  -- Before the start the weekly board is a preview of this week's real XP; prizes only count from competition_start.
  v_from := case when now() < cfg.competition_start then v_week else greatest(v_week, cfg.competition_start) end;
  v_end := case when now() < cfg.competition_start then cfg.competition_start + interval '7 days'
                else v_week + interval '7 days' end;

  with scored as (
    select u.id,
           case
             when nullif(split_part(btrim(u.full_name), ' ', 2), '') is not null
               then split_part(btrim(u.full_name), ' ', 1) || ' ' || upper(left(split_part(btrim(u.full_name), ' ', 2), 1)) || '.'
             else coalesce(nullif(split_part(btrim(u.full_name), ' ', 1), ''), 'Learner')
           end as name,
           case when a.raw_user_meta_data ->> 'avatar_url' ~* '^https?://' then a.raw_user_meta_data ->> 'avatar_url' end as avatar_url,
           case when p_period = 'all' then u.total_xp else coalesce(w.xp, 0) end as xp,
           case when p_period = 'all' then u.created_at else coalesce(w.last_at, 'infinity'::timestamptz) end as tie_at
    from public.users u
    left join auth.users a on a.id = u.id
    left join public.user_preferences pr on pr.user_id = u.id
    left join (
      select user_id, sum(amount)::int as xp, max(created_at) as last_at
      from public.xp_events where created_at >= v_from group by user_id
    ) w on w.user_id = u.id
    where not coalesce(pr.hide_from_board, false)
  ),
  ranked as (
    select s.*,
           row_number() over (order by s.xp desc, s.tie_at asc, s.id) as rank,
           lag(s.xp) over (order by s.xp desc, s.tie_at asc, s.id) as prev_xp
    from scored s
  ),
  podium as (select min(xp) as third_xp from ranked where rank = 3)
  select jsonb_build_object(
    'period_start', v_from,
    'period_end', v_end,
    'competition_start', cfg.competition_start,
    'min_weekly_xp', cfg.min_weekly_xp,
    'total', (select count(*) from ranked),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', r.rank, 'id', r.id, 'name', r.name, 'avatar_url', r.avatar_url, 'xp', r.xp, 'is_me', r.id = uid
      ) order by r.rank)
      from (select * from ranked order by rank offset v_offset limit v_limit) r
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object(
        'rank', r.rank, 'id', r.id, 'name', r.name, 'avatar_url', r.avatar_url, 'xp', r.xp, 'is_me', true,
        'xp_to_next', case when r.rank > 1 then r.prev_xp - r.xp + 1 end,
        'xp_to_podium', case when r.rank > 3 then pd.third_xp - r.xp + 1 end
      )
      from ranked r, podium pd where r.id = uid
    )
  ) into v_result;

  return v_result;
end $$;

revoke execute on function public.get_leaderboard(text, int, int) from public, anon;
grant execute on function public.get_leaderboard(text, int, int) to authenticated;
