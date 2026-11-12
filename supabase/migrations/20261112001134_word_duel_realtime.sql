create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code char(4) not null,
  game text not null default 'word-duel',
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby','playing','finished','cancelled')),
  settings jsonb not null default '{"rounds":5,"round_seconds":15}',
  current_round int not null default 0,
  round_started_at timestamptz,
  rematch_room_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours'
);
create unique index if not exists game_rooms_active_code_idx on public.game_rooms(code) where status in ('lobby','playing');

create table if not exists public.game_players (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create table if not exists public.game_rounds (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round int not null,
  prompt jsonb not null,
  primary key (room_id, round)
);
-- Correct answers live apart from the prompts so clients can never read them.
create table if not exists public.game_round_keys (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round int not null,
  correct text not null,
  primary key (room_id, round)
);
create table if not exists public.game_answers (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  round int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  correct boolean not null,
  awarded boolean not null default false,
  answered_at timestamptz not null default now(),
  primary key (room_id, round, user_id)
);
create index if not exists game_players_user_idx on public.game_players(user_id);

alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_round_keys enable row level security;
alter table public.game_answers enable row level security;

create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.game_players where room_id = p_room and user_id = auth.uid());
$$;
revoke execute on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

create policy "Members read room" on public.game_rooms for select using (public.is_room_member(id));
create policy "Members read players" on public.game_players for select using (public.is_room_member(room_id));
create policy "Members read rounds" on public.game_rounds for select using (public.is_room_member(room_id));
create policy "Members read answers" on public.game_answers for select using (public.is_room_member(room_id));
-- game_round_keys: no policies on purpose.

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='game_rooms') then
    alter publication supabase_realtime add table public.game_rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='game_players') then
    alter publication supabase_realtime add table public.game_players;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='game_answers') then
    alter publication supabase_realtime add table public.game_answers;
  end if;
end $$;

create or replace function public._seed_duel_rounds(p_room uuid, p_rounds int)
returns void language plpgsql security definer set search_path = public as $$
declare w record; i int := 0; opts text[];
begin
  for w in
    select id, word, definition from (
      select distinct on (lower(word)) id, word, definition from public.words order by lower(word), random()
    ) d order by random() limit p_rounds
  loop
    i := i + 1;
    select array_agg(word) into opts from (
      select word from (
        select distinct on (lower(word)) word from public.words where lower(word) <> lower(w.word) order by lower(word), random()
      ) x order by random() limit 3
    ) y;
    opts := opts || w.word;
    insert into public.game_rounds (room_id, round, prompt) values (
      p_room, i,
      jsonb_build_object('question', 'Which word means "' || w.definition || '"?',
                         'options', to_jsonb((select array_agg(o order by random()) from unnest(opts) o))));
    insert into public.game_round_keys (room_id, round, correct) values (p_room, i, w.word);
  end loop;
end $$;
revoke execute on function public._seed_duel_rounds(uuid, int) from public, anon, authenticated;

create or replace function public._player_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'Player') from public.users where id = p_user;
$$;
revoke execute on function public._player_name(uuid) from public, anon, authenticated;

create or replace function public._new_duel_room(p_host uuid, p_others uuid[])
returns public.game_rooms language plpgsql security definer set search_path = public as $$
declare r public.game_rooms; v_code text; alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; u uuid;
begin
  update public.game_rooms set status = 'cancelled'
    where status in ('lobby','playing') and (expires_at < now() or (host_id = p_host and status = 'lobby'));
  loop
    v_code := '';
    for i in 1..4 loop v_code := v_code || substr(alpha, 1 + floor(random() * 24)::int, 1); end loop;
    begin
      insert into public.game_rooms (code, host_id) values (v_code, p_host) returning * into r;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.game_players (room_id, user_id, name) values (r.id, p_host, public._player_name(p_host));
  foreach u in array coalesce(p_others, '{}') loop
    insert into public.game_players (room_id, user_id, name) values (r.id, u, public._player_name(u));
  end loop;
  perform public._seed_duel_rounds(r.id, (r.settings->>'rounds')::int);
  return r;
end $$;
revoke execute on function public._new_duel_room(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.create_duel_room()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.game_rooms;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  r := public._new_duel_room(uid, '{}');
  return jsonb_build_object('room_id', r.id, 'code', r.code);
end $$;

create or replace function public.join_duel_room(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.game_rooms;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into r from public.game_rooms
    where code = upper(btrim(p_code)) and status in ('lobby','playing') and expires_at > now() for update;
  if not found then raise exception 'No game found with that code'; end if;
  if exists (select 1 from public.game_players where room_id = r.id and user_id = uid) then
    return jsonb_build_object('room_id', r.id, 'code', r.code);
  end if;
  if r.status <> 'lobby' then raise exception 'That game has already started'; end if;
  if (select count(*) from public.game_players where room_id = r.id) >= 2 then raise exception 'That room is full'; end if;
  insert into public.game_players (room_id, user_id, name) values (r.id, uid, public._player_name(uid));
  return jsonb_build_object('room_id', r.id, 'code', r.code);
end $$;

create or replace function public.start_duel(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.game_rooms;
begin
  select * into r from public.game_rooms where id = p_room for update;
  if not found or r.host_id <> uid then raise exception 'Only the host can start the game'; end if;
  if r.status <> 'lobby' then return; end if;
  if (select count(*) from public.game_players where room_id = p_room) < 2 then raise exception 'Waiting for an opponent'; end if;
  update public.game_rooms set status = 'playing', current_round = 1, round_started_at = now() where id = p_room;
end $$;

create or replace function public.submit_answer(p_room uuid, p_round int, p_answer text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.game_rooms; v_key text; v_correct boolean; v_award boolean;
begin
  select * into r from public.game_rooms where id = p_room for update;
  if not found or not public.is_room_member(p_room) then raise exception 'Not in this game'; end if;
  if r.status <> 'playing' or r.current_round <> p_round then raise exception 'That round is over'; end if;
  if now() > r.round_started_at + make_interval(secs => (r.settings->>'round_seconds')::int + 2) then
    raise exception 'Time is up';
  end if;
  if exists (select 1 from public.game_answers where room_id = p_room and round = p_round and user_id = uid) then
    raise exception 'Already answered';
  end if;
  select correct into v_key from public.game_round_keys where room_id = p_room and round = p_round;
  v_correct := (p_answer = v_key);
  v_award := v_correct and not exists (select 1 from public.game_answers where room_id = p_room and round = p_round and awarded);
  insert into public.game_answers (room_id, round, user_id, correct, awarded) values (p_room, p_round, uid, v_correct, v_award);
  if v_award then
    update public.game_players set score = score + 1 where room_id = p_room and user_id = uid;
  end if;
  return jsonb_build_object('correct', v_correct, 'correct_answer', v_key, 'awarded', v_award);
end $$;

create or replace function public.advance_round(p_room uuid, p_round int)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.game_rooms; v_answers int;
begin
  select * into r from public.game_rooms where id = p_room for update;
  if not found or not public.is_room_member(p_room) then raise exception 'Not in this game'; end if;
  if r.status <> 'playing' or r.current_round <> p_round then return false; end if;
  select count(*) into v_answers from public.game_answers where room_id = p_room and round = p_round;
  if v_answers < 2 and now() < r.round_started_at + make_interval(secs => (r.settings->>'round_seconds')::int) then
    return false;
  end if;
  if p_round >= (r.settings->>'rounds')::int then
    update public.game_rooms set status = 'finished' where id = p_room;
  else
    update public.game_rooms set current_round = p_round + 1, round_started_at = now() where id = p_room;
  end if;
  return true;
end $$;

create or replace function public.get_duel_state(p_room uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.game_rooms;
begin
  if not public.is_room_member(p_room) then raise exception 'Not in this game'; end if;
  select * into r from public.game_rooms where id = p_room;
  return jsonb_build_object(
    'server_now', now(),
    'room', jsonb_build_object('id', r.id, 'code', r.code, 'status', r.status, 'host_id', r.host_id,
       'current_round', r.current_round, 'round_started_at', r.round_started_at,
       'total_rounds', (r.settings->>'rounds')::int, 'round_seconds', (r.settings->>'round_seconds')::int,
       'rematch_room_id', r.rematch_room_id),
    'players', (select coalesce(jsonb_agg(jsonb_build_object('user_id', user_id, 'name', name, 'score', score) order by joined_at), '[]'::jsonb)
                from public.game_players where room_id = p_room),
    'rounds', (select coalesce(jsonb_agg(jsonb_build_object('round', round, 'question', prompt->>'question', 'options', prompt->'options') order by round), '[]'::jsonb)
               from public.game_rounds where room_id = p_room and round <= greatest(r.current_round, 1)),
    'answers', (select coalesce(jsonb_agg(jsonb_build_object('round', round, 'user_id', user_id, 'correct', correct)), '[]'::jsonb)
                from public.game_answers where room_id = p_room)
  );
end $$;

create or replace function public.rematch_duel(p_room uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.game_rooms; n public.game_rooms; v_other uuid;
begin
  select * into r from public.game_rooms where id = p_room for update;
  if not found or not public.is_room_member(p_room) then raise exception 'Not in this game'; end if;
  if r.rematch_room_id is not null then
    select * into n from public.game_rooms where id = r.rematch_room_id;
    return jsonb_build_object('code', n.code);
  end if;
  if r.status <> 'finished' then raise exception 'The game is not over yet'; end if;
  select user_id into v_other from public.game_players where room_id = p_room and user_id <> uid limit 1;
  n := public._new_duel_room(uid, case when v_other is null then '{}' else array[v_other] end);
  update public.game_rooms set rematch_room_id = n.id where id = p_room;
  return jsonb_build_object('code', n.code);
end $$;

create or replace function public.leave_duel_room(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.game_rooms;
begin
  select * into r from public.game_rooms where id = p_room for update;
  if not found or r.status <> 'lobby' or not public.is_room_member(p_room) then return; end if;
  if r.host_id = uid then
    update public.game_rooms set status = 'cancelled' where id = p_room;
  else
    delete from public.game_players where room_id = p_room and user_id = uid;
  end if;
end $$;

revoke execute on function public.create_duel_room() from public, anon;
revoke execute on function public.join_duel_room(text) from public, anon;
revoke execute on function public.start_duel(uuid) from public, anon;
revoke execute on function public.submit_answer(uuid, int, text) from public, anon;
revoke execute on function public.advance_round(uuid, int) from public, anon;
revoke execute on function public.get_duel_state(uuid) from public, anon;
revoke execute on function public.rematch_duel(uuid) from public, anon;
revoke execute on function public.leave_duel_room(uuid) from public, anon;
grant execute on function public.create_duel_room() to authenticated;
grant execute on function public.join_duel_room(text) to authenticated;
grant execute on function public.start_duel(uuid) to authenticated;
grant execute on function public.submit_answer(uuid, int, text) to authenticated;
grant execute on function public.advance_round(uuid, int) to authenticated;
grant execute on function public.get_duel_state(uuid) to authenticated;
grant execute on function public.rematch_duel(uuid) to authenticated;
grant execute on function public.leave_duel_room(uuid) to authenticated;
