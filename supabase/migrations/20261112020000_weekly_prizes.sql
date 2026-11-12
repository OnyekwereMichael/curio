-- Weekly prizes: config, winners history, and a competition-aware get_leaderboard.
-- Additive only (get_leaderboard is replaced in place with the same signature).
-- Week = Monday 00:00 -> Monday 00:00 in Africa/Lagos (WAT, UTC+1, no DST).
-- Weekly XP only counts from greatest(week start, competition_start).

create table if not exists public.leaderboard_config (
  id boolean primary key default true check (id),         -- single row
  competition_start timestamptz not null,
  min_weekly_xp int not null default 50,
  currency text not null default 'NGN',
  prizes jsonb not null                                   -- [{"place":1,"amount":2500}, ...]
);
alter table public.leaderboard_config enable row level security;
drop policy if exists "Authenticated read leaderboard config" on public.leaderboard_config;
create policy "Authenticated read leaderboard config" on public.leaderboard_config
  for select to authenticated using (true);

insert into public.leaderboard_config (id, competition_start, min_weekly_xp, currency, prizes)
values (true, '2026-11-16 00:00:00+01', 50, 'NGN',
        '[{"place":1,"amount":2500},{"place":2,"amount":1500},{"place":3,"amount":1000}]')
on conflict (id) do nothing;

create table if not exists public.weekly_winners (
  id uuid primary key default gen_random_uuid(),
  week_start timestamptz not null,
  week_end timestamptz not null,
  rank int not null check (rank between 1 and 3),
  user_id uuid not null references auth.users(id),
  xp int not null,
  prize_amount int not null check (prize_amount >= 0),
  currency text not null default 'NGN',
  paid_status text not null default 'pending' check (paid_status in ('pending', 'paid', 'void')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (week_start, rank),
  unique (week_start, user_id)
);
create index if not exists weekly_winners_user_idx on public.weekly_winners (user_id, week_start desc);
alter table public.weekly_winners enable row level security;
drop policy if exists "Authenticated read weekly winners" on public.weekly_winners;
create policy "Authenticated read weekly winners" on public.weekly_winners
  for select to authenticated using (true);
-- No insert/update/delete policies: only the service role / SECURITY DEFINER functions can write.
revoke insert, update, delete on public.weekly_winners from anon, authenticated;

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

  v_from := greatest(v_week, cfg.competition_start);
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

-- Records the top 3 of a finished week as 'pending' payouts. Service role only
-- (run from the SQL editor / an admin job). Idempotent per (week_start, rank).
create or replace function public.record_weekly_winners(p_week_start timestamptz)
returns int language plpgsql security definer set search_path = public as $$
declare
  cfg public.leaderboard_config%rowtype;
  v_from timestamptz;
  v_end timestamptz := p_week_start + interval '7 days';
  v_count int;
begin
  select * into cfg from public.leaderboard_config limit 1;
  if v_end > now() then raise exception 'That week has not finished yet'; end if;
  v_from := greatest(p_week_start, cfg.competition_start);

  with scores as (
    select x.user_id, sum(x.amount)::int as xp, max(x.created_at) as last_at
    from public.xp_events x
    left join public.user_preferences pr on pr.user_id = x.user_id
    where x.created_at >= v_from and x.created_at < v_end and not coalesce(pr.hide_from_board, false)
    group by x.user_id
    having sum(x.amount) >= cfg.min_weekly_xp
  ),
  top3 as (
    select s.*, row_number() over (order by s.xp desc, s.last_at asc, s.user_id) as rank from scores s
  ),
  ins as (
    insert into public.weekly_winners (week_start, week_end, rank, user_id, xp, prize_amount, currency)
    select p_week_start, v_end, t.rank, t.user_id, t.xp,
           (select (p ->> 'amount')::int from jsonb_array_elements(cfg.prizes) p where (p ->> 'place')::int = t.rank),
           cfg.currency
    from top3 t where t.rank <= 3
    on conflict do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end $$;

revoke execute on function public.record_weekly_winners(timestamptz) from public, anon, authenticated;
revoke execute on function public.get_leaderboard(text, int, int) from public, anon;
grant execute on function public.get_leaderboard(text, int, int) to authenticated;
