create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create table if not exists public.invites (
  code text primary key,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create table if not exists public.streak_buddies (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  started_on date not null default (now() at time zone 'utc')::date,
  current boolean not null default true,
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists invites_inviter_idx on public.invites(inviter_id);
create index if not exists streak_buddies_b_idx on public.streak_buddies(user_b);

alter table public.friendships enable row level security;
alter table public.invites enable row level security;
alter table public.streak_buddies enable row level security;
create policy "Users read own friendships" on public.friendships for select using (auth.uid() = user_id);
create policy "Users read own buddies" on public.streak_buddies for select using (auth.uid() in (user_a, user_b));
-- invites: no client policies; all access goes through the functions below.

create or replace function public.get_or_create_invite()
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_code text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select code into v_code from public.invites
    where inviter_id = uid and accepted_by is null and expires_at > now() order by created_at desc limit 1;
  if v_code is not null then return v_code; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.invites (code, inviter_id) values (v_code, uid);
      return v_code;
    exception when unique_violation then null;
    end;
  end loop;
end $$;

create or replace function public.accept_invite(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); inv public.invites%rowtype; v_name text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into inv from public.invites where code = upper(btrim(p_code)) for update;
  if not found or inv.accepted_by is not null or inv.expires_at <= now() then
    raise exception 'Invite not found or expired';
  end if;
  if inv.inviter_id = uid then raise exception 'That is your own invite code'; end if;
  if exists (select 1 from public.friendships where user_id = uid and friend_id = inv.inviter_id) then
    raise exception 'You are already friends';
  end if;
  insert into public.friendships (user_id, friend_id) values (uid, inv.inviter_id), (inv.inviter_id, uid)
    on conflict do nothing;
  update public.invites set accepted_by = uid, accepted_at = now() where code = inv.code;
  select coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'Your friend') into v_name
    from public.users where id = inv.inviter_id;
  return jsonb_build_object('friend_name', coalesce(v_name, 'Your friend'));
end $$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from public.friendships
    where (user_id = uid and friend_id = p_friend_id) or (user_id = p_friend_id and friend_id = uid);
  update public.streak_buddies set current = false
    where current and user_a = least(uid, p_friend_id) and user_b = greatest(uid, p_friend_id);
end $$;

create or replace function public.set_streak_buddy(p_friend_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  update public.streak_buddies set current = false
    where current and (uid in (user_a, user_b) or (p_friend_id is not null and p_friend_id in (user_a, user_b)));
  if p_friend_id is null then return; end if;
  if not exists (select 1 from public.friendships where user_id = uid and friend_id = p_friend_id) then
    raise exception 'You can only pick a friend as your streak buddy';
  end if;
  insert into public.streak_buddies (user_a, user_b, started_on)
    values (least(uid, p_friend_id), greatest(uid, p_friend_id), (now() at time zone 'utc')::date)
  on conflict (user_a, user_b) do update set current = true, started_on = excluded.started_on;
end $$;

create or replace function public.get_friends_data()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_week_start timestamptz := date_trunc('week', now() at time zone 'utc') at time zone 'utc';
  v_today date := (now() at time zone 'utc')::date;
  v_board jsonb; v_count int; v_hidden boolean;
  v_buddy public.streak_buddies%rowtype; v_buddy_id uuid; v_buddy_name text;
  v_days int := 0; v_d date; v_done_today boolean := false; v_both boolean;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.weekly_xp desc, t.name), '[]'::jsonb) into v_board from (
    select u.id,
           coalesce(nullif(split_part(btrim(u.full_name), ' ', 1), ''), 'Learner') as name,
           coalesce((select sum(x.amount) from public.xp_events x where x.user_id = u.id and x.created_at >= v_week_start), 0)::int as weekly_xp,
           (u.id = uid) as is_me
    from public.users u
    where u.id = uid
       or (u.id in (select friend_id from public.friendships where user_id = uid)
           and not coalesce((select p.hide_from_board from public.user_preferences p where p.user_id = u.id), false))
  ) t;

  select count(*) into v_count from public.friendships where user_id = uid;
  select coalesce(hide_from_board, false) into v_hidden from public.user_preferences where user_id = uid;

  select * into v_buddy from public.streak_buddies where current and uid in (user_a, user_b) limit 1;
  if found then
    v_buddy_id := case when v_buddy.user_a = uid then v_buddy.user_b else v_buddy.user_a end;
    select coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'Your buddy') into v_buddy_name from public.users where id = v_buddy_id;
    v_done_today := (select count(distinct user_id) = 2 from public.user_activity_log
                     where user_id in (uid, v_buddy_id) and activity_date = v_today and quiz_completed);
    v_d := case when v_done_today then v_today else v_today - 1 end;
    while v_d >= v_buddy.started_on loop
      select count(distinct user_id) = 2 into v_both from public.user_activity_log
        where user_id in (uid, v_buddy_id) and activity_date = v_d and quiz_completed;
      exit when not v_both;
      v_days := v_days + 1;
      v_d := v_d - 1;
    end loop;
  end if;

  return jsonb_build_object(
    'leaderboard', v_board,
    'friends_count', v_count,
    'hidden', coalesce(v_hidden, false),
    'streak_buddy', case when v_buddy_id is null then null else
       jsonb_build_object('id', v_buddy_id, 'name', coalesce(v_buddy_name, 'Your buddy'), 'days_together', v_days, 'both_done_today', v_done_today) end
  );
end $$;

revoke execute on function public.get_or_create_invite() from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.set_streak_buddy(uuid) from public, anon;
revoke execute on function public.get_friends_data() from public, anon;
grant execute on function public.get_or_create_invite() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.set_streak_buddy(uuid) to authenticated;
grant execute on function public.get_friends_data() to authenticated;
