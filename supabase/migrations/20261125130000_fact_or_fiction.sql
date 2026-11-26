-- Fact or Fiction: live multiplayer party game (2-8 players) on the Play tab.
--
-- Same model as Word Duel: signed-in users only, and every move goes through a security-definer function.
-- The server owns the statement bank + answer key (clients can't read it), the round clock, voting rules and scoring.
-- This replaces an earlier anonymous prototype (fof_* tables with open access, test data only).

drop table if exists public.fof_votes, public.fof_players, public.fof_rooms cascade;
drop function if exists public.fof_guard_player();

-- ───────────────────────── statement bank (server-side only) ─────────────────────────
-- To add statements: insert rows here. category is one of sci | his | ani | geo | pop | afr.
create table public.fof_statements (
  id        int primary key,
  category  text not null check (category in ('sci','his','ani','geo','pop','afr')),
  statement text not null,
  answer    boolean not null,        -- true = FACT, false = FICTION
  why       text not null
);
alter table public.fof_statements enable row level security;   -- no policies: unreadable except through the functions below
revoke all on public.fof_statements from anon, authenticated;

-- ───────────────────────── rooms / players / votes ─────────────────────────
create table public.fof_rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  host_id          uuid not null references auth.users(id) on delete cascade,
  status           text not null default 'lobby' check (status in ('lobby','playing','finished','closed')),
  phase            text not null default 'question' check (phase in ('question','reveal')),
  current_round    int  not null default 0,
  total_rounds     int  not null default 10 check (total_rounds between 1 and 30),
  round_seconds    int  not null default 15 check (round_seconds between 5 and 60),
  categories       text[] not null default '{sci,his,ani,geo,pop,afr}',
  deck             int[] not null default '{}',          -- statement ids in play order (shuffled per game, no repeats)
  round_started_at timestamptz,
  reveal_at        timestamptz,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '6 hours'
);
create unique index fof_rooms_live_code on public.fof_rooms (code) where status in ('lobby','playing','finished');

create table public.fof_players (
  room_id     uuid not null references public.fof_rooms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  avatar      text not null,
  score       int  not null default 0,
  streak      int  not null default 0,
  voted_round int  not null default 0,       -- the round this player has voted in (the vote itself stays secret until reveal)
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,
  primary key (room_id, user_id)
);
create unique index fof_players_name_uq on public.fof_players (room_id, lower(name));
create index fof_players_user_idx on public.fof_players (user_id);

create table public.fof_votes (
  room_id uuid not null references public.fof_rooms(id) on delete cascade,
  round   int  not null,
  user_id uuid not null,
  choice  boolean not null,                  -- true = FACT
  ms      int  not null check (ms >= 0),     -- measured on the player's own device
  points  int  not null default 0,
  primary key (room_id, round, user_id)
);

-- heartbeats live in their own table so they never spam Realtime
create table public.fof_presence (
  room_id uuid not null references public.fof_rooms(id) on delete cascade,
  user_id uuid not null,
  seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.fof_rooms    enable row level security;
alter table public.fof_players  enable row level security;
alter table public.fof_votes    enable row level security;
alter table public.fof_presence enable row level security;
revoke all on public.fof_votes, public.fof_presence from anon, authenticated;
revoke all on public.fof_rooms, public.fof_players from anon;
revoke insert, update, delete on public.fof_rooms, public.fof_players from authenticated;  -- writes only via functions

create or replace function public.fof_is_member(p_room uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.fof_players where room_id = p_room and user_id = auth.uid() and left_at is null);
$$;
create policy "Members read room"    on public.fof_rooms    for select to authenticated using (public.fof_is_member(id));
create policy "Members read players" on public.fof_players  for select to authenticated using (public.fof_is_member(room_id));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='fof_rooms') then
    alter publication supabase_realtime add table public.fof_rooms; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='fof_players') then
    alter publication supabase_realtime add table public.fof_players; end if;
end $$;

-- ───────────────────────── helpers ─────────────────────────
create or replace function public._fof_active(p_room uuid, p_user uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce(
    (select seen_at from public.fof_presence where room_id = p_room and user_id = p_user),
    (select joined_at from public.fof_players where room_id = p_room and user_id = p_user)
  ) > now() - interval '20 seconds';
$$;

create or replace function public._fof_add_player(p_room uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  avatars text[] := array['🦊','🐼','🐸','🦁','🐙','🦄','🐵','🐧','🦖','🐯','🐰','🐨','🦉','🐲','👾','🤖'];
  free text[]; v_avatar text; base text; v_name text; n int := 1;
begin
  select coalesce(array_agg(a), '{}') into free from unnest(avatars) a
    where a not in (select avatar from public.fof_players where room_id = p_room and left_at is null);
  if cardinality(free) = 0 then free := avatars; end if;
  v_avatar := free[1 + floor(random() * cardinality(free))::int];
  base := left(coalesce(nullif(btrim(public._player_name(p_user)), ''), 'Player'), 14);
  v_name := base;
  while exists (select 1 from public.fof_players where room_id = p_room and lower(name) = lower(v_name)) loop
    n := n + 1; v_name := left(base, 12) || ' ' || n;
  end loop;
  insert into public.fof_players (room_id, user_id, name, avatar) values (p_room, p_user, v_name, v_avatar);
end $$;

-- ───────────────────────── room lifecycle ─────────────────────────
create or replace function public.fof_create_room() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; c text; letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ'; i int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from public.fof_rooms where expires_at < now() - interval '1 day';      -- housekeeping
  update public.fof_rooms set status = 'closed' where host_id = uid and status = 'lobby';
  for i in 1..30 loop
    c := (select string_agg(substr(letters, 1 + floor(random() * length(letters))::int, 1), '') from generate_series(1, 4));
    exit when not exists (select 1 from public.fof_rooms where code = c and status in ('lobby','playing','finished'))
          and not exists (select 1 from public.game_rooms where code = c and status in ('lobby','playing'));
    c := null;
  end loop;
  if c is null then raise exception 'Could not create a room, try again'; end if;
  insert into public.fof_rooms (code, host_id) values (c, uid) returning * into r;
  perform public._fof_add_player(r.id, uid);
  return jsonb_build_object('room_id', r.id, 'code', r.code);
end $$;

create or replace function public.fof_find_room(p_code text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.fof_rooms
    where code = upper(btrim(p_code)) and status in ('lobby','playing','finished') and expires_at > now() and auth.uid() is not null);
$$;

create or replace function public.fof_join_room(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into r from public.fof_rooms
    where code = upper(btrim(p_code)) and status in ('lobby','playing','finished') and expires_at > now() for update;
  if not found then raise exception 'No game found with that code'; end if;
  if exists (select 1 from public.fof_players where room_id = r.id and user_id = uid) then   -- refresh / rejoin: restore the seat
    update public.fof_players set left_at = null where room_id = r.id and user_id = uid;
    return jsonb_build_object('room_id', r.id, 'code', r.code);
  end if;
  if r.status <> 'lobby' then raise exception 'That game has already started'; end if;
  if (select count(*) from public.fof_players where room_id = r.id and left_at is null) >= 8 then
    raise exception 'That room is full (8 players max)';
  end if;
  perform public._fof_add_player(r.id, uid);
  return jsonb_build_object('room_id', r.id, 'code', r.code);
end $$;

create or replace function public.fof_heartbeat(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.fof_is_member(p_room) then return; end if;
  insert into public.fof_presence (room_id, user_id, seen_at) values (p_room, auth.uid(), now())
  on conflict (room_id, user_id) do update set seen_at = now();
end $$;

create or replace function public.fof_set_settings(p_room uuid, p_rounds int, p_seconds int, p_categories text[]) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can change settings'; end if;
  if r.status <> 'lobby' then return; end if;
  if p_rounds not in (5, 10, 15, 20) or p_seconds not between 10 and 30 then raise exception 'Bad settings'; end if;
  if p_categories is null or cardinality(p_categories) = 0
     or exists (select 1 from unnest(p_categories) c where c not in ('sci','his','ani','geo','pop','afr')) then
    raise exception 'Pick at least one category';
  end if;
  update public.fof_rooms set total_rounds = p_rounds, round_seconds = p_seconds, categories = p_categories where id = p_room;
end $$;

create or replace function public.fof_start(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms; v_deck int[];
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can start the game'; end if;
  if r.status <> 'lobby' then return; end if;
  if (select count(*) from public.fof_players where room_id = p_room and left_at is null) < 2 then
    raise exception 'Need at least 2 players';
  end if;
  -- shuffled per game: each statement appears at most once
  select coalesce(array_agg(id), '{}') into v_deck from (
    select id from public.fof_statements where category = any (r.categories) order by random() limit r.total_rounds
  ) s;
  if cardinality(v_deck) = 0 then raise exception 'No statements in those categories'; end if;
  delete from public.fof_votes where room_id = p_room;
  update public.fof_players set score = 0, streak = 0, voted_round = 0 where room_id = p_room;
  update public.fof_rooms set status = 'playing', phase = 'question', current_round = 1, deck = v_deck,
    total_rounds = cardinality(v_deck), round_started_at = now(), reveal_at = null where id = p_room;
end $$;

create or replace function public.fof_kick(p_room uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms;
begin
  select * into r from public.fof_rooms where id = p_room;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can remove players'; end if;
  if p_user = auth.uid() then return; end if;
  delete from public.fof_players where room_id = p_room and user_id = p_user;
end $$;

create or replace function public.fof_close_room(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.fof_rooms set status = 'closed' where id = p_room and host_id = auth.uid();
end $$;

create or replace function public.fof_leave(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; v_next uuid;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or not exists (select 1 from public.fof_players where room_id = p_room and user_id = uid) then return; end if;
  if r.status = 'lobby' then delete from public.fof_players where room_id = p_room and user_id = uid;
  else update public.fof_players set left_at = now() where room_id = p_room and user_id = uid; end if;
  if r.host_id = uid then                       -- hand the room to the longest-present player, or close it
    select user_id into v_next from public.fof_players where room_id = p_room and left_at is null and user_id <> uid
      order by public._fof_active(room_id, user_id) desc, joined_at limit 1;
    if v_next is null then update public.fof_rooms set status = 'closed' where id = p_room;
    else update public.fof_rooms set host_id = v_next where id = p_room; end if;
  elsif not exists (select 1 from public.fof_players where room_id = p_room and left_at is null) then
    update public.fof_rooms set status = 'closed' where id = p_room;
  end if;
end $$;

-- If the host's connection has been gone for a while, the longest-present player takes over.
create or replace function public.fof_claim_host(p_room uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; v_next uuid;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or r.status in ('closed') or not public.fof_is_member(p_room) or r.host_id = uid then return false; end if;
  if public._fof_active(p_room, r.host_id) and exists (select 1 from public.fof_players where room_id = p_room and user_id = r.host_id and left_at is null) then
    return false;
  end if;
  select user_id into v_next from public.fof_players
    where room_id = p_room and left_at is null and user_id <> r.host_id and public._fof_active(room_id, user_id)
    order by joined_at limit 1;
  if v_next is distinct from uid then return false; end if;
  update public.fof_rooms set host_id = uid where id = p_room;
  return true;
end $$;

-- ───────────────────────── gameplay ─────────────────────────
-- p_ms is the response time each player measured on their own device (no synced clocks involved).
create or replace function public.fof_vote(p_room uuid, p_round int, p_choice boolean, p_ms int) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; n int;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  if r.status <> 'playing' or r.phase <> 'question' or r.current_round <> p_round then raise exception 'Too late'; end if;
  if now() > r.round_started_at + make_interval(secs => r.round_seconds + 4) then raise exception 'Too late'; end if;
  insert into public.fof_votes (room_id, round, user_id, choice, ms)
  values (p_room, p_round, uid, p_choice, greatest(0, least(coalesce(p_ms, 0), r.round_seconds * 1000)))
  on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then update public.fof_players set voted_round = p_round where room_id = p_room and user_id = uid; end if;
end $$;

-- Ends the voting phase once every PRESENT player has voted, or the timer (+2s grace) has run out.
-- Any player can call it (so a vanished host never stalls the game); only the first call does the scoring.
create or replace function public.fof_advance(p_room uuid, p_round int) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms; pl record; v public.fof_votes; v_ans boolean; v_streak int; v_pts int; n_active int; n_voted int;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  if r.status <> 'playing' or r.phase <> 'question' or r.current_round <> p_round then return false; end if;

  select count(*) filter (where public._fof_active(room_id, user_id)),
         count(*) filter (where public._fof_active(room_id, user_id) and voted_round = r.current_round)
    into n_active, n_voted from public.fof_players where room_id = p_room and left_at is null;
  if not (now() >= r.round_started_at + make_interval(secs => r.round_seconds + 2) or (n_active > 0 and n_voted >= n_active)) then
    return false;
  end if;

  select answer into v_ans from public.fof_statements where id = r.deck[r.current_round];
  for pl in select * from public.fof_players where room_id = p_room and left_at is null loop
    select * into v from public.fof_votes where room_id = p_room and round = r.current_round and user_id = pl.user_id;
    if found and v.choice = v_ans then
      v_streak := pl.streak + 1;
      -- 100 for being right + up to 100 for speed + 20 per extra consecutive correct answer (max 100)
      v_pts := 100 + round(100 * greatest(0, 1 - v.ms::numeric / (r.round_seconds * 1000)))::int
                   + case when v_streak >= 2 then least(100, 20 * (v_streak - 1)) else 0 end;
      update public.fof_votes set points = v_pts where room_id = p_room and round = r.current_round and user_id = pl.user_id;
      update public.fof_players set score = score + v_pts, streak = v_streak where room_id = p_room and user_id = pl.user_id;
    else
      update public.fof_players set streak = 0 where room_id = p_room and user_id = pl.user_id;
    end if;
  end loop;
  update public.fof_rooms set phase = 'reveal', reveal_at = now() where id = p_room;
  return true;
end $$;

-- Host moves on (anyone can, if the host has been unresponsive for 45s after the reveal).
create or replace function public.fof_next(p_room uuid, p_round int) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  if r.status <> 'playing' or r.phase <> 'reveal' or r.current_round <> p_round then return false; end if;
  if r.host_id <> uid and r.reveal_at > now() - interval '45 seconds' then raise exception 'Waiting for the host'; end if;
  if r.current_round >= r.total_rounds then
    update public.fof_rooms set status = 'finished' where id = p_room;
  else
    update public.fof_rooms set current_round = r.current_round + 1, phase = 'question', round_started_at = now(), reveal_at = null where id = p_room;
  end if;
  return true;
end $$;

create or replace function public.fof_play_again(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can restart'; end if;
  if r.status <> 'finished' then return; end if;
  delete from public.fof_players where room_id = p_room and user_id <> auth.uid()
    and (left_at is not null or not public._fof_active(room_id, user_id));
  delete from public.fof_votes where room_id = p_room;
  update public.fof_players set score = 0, streak = 0, voted_round = 0, left_at = null where room_id = p_room;
  update public.fof_rooms set status = 'lobby', phase = 'question', current_round = 0, deck = '{}',
    round_started_at = null, reveal_at = null, expires_at = now() + interval '6 hours' where id = p_room;
end $$;

-- Everything a client needs to draw the screen. The answer + explanation only appear once the round is revealed.
create or replace function public.fof_get_state(p_room uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; st public.fof_statements; v_round jsonb := null; v_mine boolean;
begin
  select * into r from public.fof_rooms where id = p_room;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;

  if r.status = 'playing' and r.current_round between 1 and cardinality(r.deck) then
    select * into st from public.fof_statements where id = r.deck[r.current_round];
    v_round := jsonb_build_object('round', r.current_round, 'category', st.category, 'text', st.statement);
    if r.phase = 'reveal' then
      v_round := v_round || jsonb_build_object('answer', st.answer, 'why', st.why, 'results', coalesce((
        select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'choice', v.choice, 'ms', v.ms, 'points', coalesce(v.points, 0)))
        from public.fof_players p
        left join public.fof_votes v on v.room_id = p.room_id and v.user_id = p.user_id and v.round = r.current_round
        where p.room_id = p_room and p.left_at is null), '[]'::jsonb));
    end if;
    select choice into v_mine from public.fof_votes where room_id = p_room and round = r.current_round and user_id = uid;
  end if;

  return jsonb_build_object(
    'server_now', now(),
    'room', jsonb_build_object('id', r.id, 'code', r.code, 'status', r.status, 'phase', r.phase, 'host_id', r.host_id,
      'current_round', r.current_round, 'total_rounds', r.total_rounds, 'round_seconds', r.round_seconds,
      'categories', r.categories, 'round_started_at', r.round_started_at, 'reveal_at', r.reveal_at, 'games_key', extract(epoch from r.created_at)),
    'players', coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.name, 'avatar', p.avatar,
        'score', p.score, 'streak', p.streak, 'voted', p.voted_round = r.current_round and r.current_round > 0,
        'active', public._fof_active(p.room_id, p.user_id)) order by p.joined_at)
      from public.fof_players p where p.room_id = p_room and p.left_at is null), '[]'::jsonb),
    'round', v_round,
    'my_choice', v_mine,
    'pool', (select count(*) from public.fof_statements where category = any (r.categories))
  );
end $$;

-- Lock the functions down to signed-in users
do $$
declare f text;
begin
  foreach f in array array[
    'fof_create_room()','fof_find_room(text)','fof_join_room(text)','fof_heartbeat(uuid)','fof_set_settings(uuid,int,int,text[])',
    'fof_start(uuid)','fof_kick(uuid,uuid)','fof_close_room(uuid)','fof_leave(uuid)','fof_claim_host(uuid)','fof_vote(uuid,int,boolean,int)',
    'fof_advance(uuid,int)','fof_next(uuid,int)','fof_play_again(uuid)','fof_get_state(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public._fof_active(uuid,uuid), public._fof_add_player(uuid,uuid), public.fof_is_member(uuid) from public, anon;
  grant execute on function public.fof_is_member(uuid) to authenticated;
end $$;

-- ───────────────────────── statements ─────────────────────────
insert into public.fof_statements (id, category, statement, answer, why) values
  (1, 'sci', $fofp8ic$Honey never spoils. Edible honey has been found in ancient Egyptian tombs.$fofp8ic$, true, $fof37n8$Its low moisture and high acidity make it nearly impossible for microbes to survive.$fof37n8$),
  (2, 'sci', $fofr5hz$Lightning never strikes the same place twice.$fofr5hz$, false, $fof7947$The Empire State Building gets hit around 20–25 times every year.$fof7947$),
  (3, 'sci', $fofurw6$A day on Venus is longer than a year on Venus.$fofurw6$, true, $fofj9di$Venus spins once every ~243 Earth days but circles the Sun in only ~225.$fofj9di$),
  (4, 'sci', $fofsvsj$Sound travels faster in space than it does in air.$fofsvsj$, false, $fofn17u$Sound needs something to travel through, and space is almost a vacuum, so it barely travels at all.$fofn17u$),
  (5, 'sci', $fof3vmk$Bananas are slightly radioactive.$fof3vmk$, true, $foffyxu$They contain potassium-40, a natural radioactive isotope. It is completely harmless.$foffyxu$),
  (6, 'sci', $fof45wg$Old church windows are thicker at the bottom because glass slowly flows downward.$fof45wg$, false, $fofcad7$Glass is an amorphous solid. Old panes were simply made unevenly and installed with the heavy edge down.$fofcad7$),
  (7, 'sci', $fof62f9$An adult human body has 206 bones.$fof62f9$, true, $fofdchv$Babies are born with far more (around 270+), and many fuse together as we grow.$fofdchv$),
  (8, 'sci', $fofvdqy$Humans only use 10% of their brains.$fofvdqy$, false, $fof6jip$Brain scans show we use virtually all of our brain over the course of a day.$fof6jip$),
  (9, 'sci', $fof9dlf$Water can boil and freeze at the same time.$fof9dlf$, true, $fofuvod$At the "triple point" (0.01°C and very low pressure), ice, liquid water and vapour coexist.$fofuvod$),
  (10, 'his', $fofhny1$The Great Wall of China is visible from space with the naked eye.$fofhny1$, false, $fofvvjq$It is very long but extremely narrow. Astronauts say it cannot be picked out unaided.$fofvvjq$),
  (11, 'his', $fof27t3$Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.$fof27t3$, true, $fofjj5m$The Great Pyramid dates to about 2560 BC, Cleopatra died in 30 BC, and the Moon landing was in 1969.$fofjj5m$),
  (12, 'his', $fofsr7m$Napoleon Bonaparte was unusually short.$fofsr7m$, false, $fof706a$He was about 5'6"–5'7", average or taller for his time. Mixed-up French and English inches started the myth.$fof706a$),
  (13, 'his', $fofgffp$Vikings wore horned helmets into battle.$fofgffp$, false, $fof2wgr$There is no evidence of it. The image comes from 19th-century opera costumes.$fof2wgr$),
  (14, 'his', $foftwn5$The Hundred Years' War lasted 116 years.$foftwn5$, true, $fofkzgk$It ran from 1337 to 1453.$fofkzgk$),
  (15, 'his', $fof20t6$The Titanic sank on its very first voyage.$fof20t6$, true, $fofkyo2$It left Southampton in April 1912 and hit an iceberg a few days into its maiden crossing.$fofkyo2$),
  (16, 'his', $fofy03f$Albert Einstein failed maths at school.$fofy03f$, false, $fofspvu$He excelled at maths and had mastered calculus by about age 15.$fofspvu$),
  (17, 'ani', $fof29ov$Octopuses have three hearts.$fof29ov$, true, $fofite2$Two pump blood through the gills and one pumps it to the rest of the body.$fofite2$),
  (18, 'ani', $fofkz10$Goldfish have a three-second memory.$fofkz10$, false, $fofwqo2$Studies show they can remember things for months.$fofwqo2$),
  (19, 'ani', $fofq6zl$Bats are blind.$fofq6zl$, false, $fof01eu$All bats can see, and many also use echolocation to hunt in the dark.$fof01eu$),
  (20, 'ani', $fof9edo$Wombats produce cube-shaped poop.$fof9edo$, true, $fofckmb$Their intestines shape it into cubes, which helps it stay put and mark territory.$fofckmb$),
  (21, 'ani', $fofzlbv$A group of flamingos is called a "flamboyance".$fofzlbv$, true, $fofvuoo$It really is, and it fits perfectly.$fofvuoo$),
  (22, 'ani', $fof023c$Camels store water in their humps.$fof023c$, false, $foffxl4$The humps store fat. Camels survive without water thanks to other adaptations.$foffxl4$),
  (23, 'ani', $foffghr$Sharks are older than trees.$foffghr$, true, $fof8jmu$Sharks have been around for roughly 450 million years. The first trees appeared about 385 million years ago.$fof8jmu$),
  (24, 'ani', $fofzfjd$Giraffes have the same number of neck bones as humans: seven.$fofzfjd$, true, $fofvgwn$Giraffe neck bones are just enormously long.$fofvgwn$),
  (25, 'ani', $fofbnia$Ostriches bury their heads in the sand when scared.$fofbnia$, false, $fofc7it$That is a myth. They lie low with their necks flat along the ground to hide.$fofc7it$),
  (26, 'geo', $fofnpw5$Africa has more countries than any other continent.$fofnpw5$, true, $fofcq2m$Africa has 54 recognised countries.$fofcq2m$),
  (27, 'geo', $fofh4dw$The Sahara is the largest desert in the world.$fofh4dw$, false, $fofz6fd$Antarctica is bigger. A desert is defined by low rainfall, not heat.$fofz6fd$),
  (28, 'geo', $fofsytg$Sydney is the capital of Australia.$fofsytg$, false, $fof8wyx$The capital is Canberra, chosen as a compromise between Sydney and Melbourne.$fof8wyx$),
  (29, 'geo', $fofykyb$Vatican City is the smallest country in the world.$fofykyb$, true, $fofghez$It covers only about 0.44 square kilometres.$fofghez$),
  (30, 'geo', $fofkjvo$Russia spans 11 time zones.$fofkjvo$, true, $fofyw1d$It is so wide that the sun rises in the east while it is still the previous day in the west.$fofyw1d$),
  (31, 'geo', $fof1qz1$Istanbul is the capital of Turkey.$fof1qz1$, false, $fof9qta$The capital is Ankara, even though Istanbul is the largest city.$fof9qta$),
  (32, 'geo', $fofxc07$Greenland is the largest island in the world.$fofxc07$, true, $fofaaij$At about 2.1 million km², it is bigger than New Guinea (Australia counts as a continent).$fofaaij$),
  (33, 'pop', $fofxr3r$Mario's original name was "Jumpman".$fofxr3r$, true, $fof7088$He was the hero of Donkey Kong in 1981 before being renamed after a landlord named Mario Segale.$fof7088$),
  (34, 'pop', $fofajfi$Darth Vader says "Luke, I am your father."$fofajfi$, false, $fof7hvo$The real line is "No, I am your father."$fof7hvo$),
  (35, 'pop', $fofzok8$Minecraft is the best-selling video game of all time.$fofzok8$, true, $fofrfeg$It has sold over 300 million copies.$fofrfeg$),
  (36, 'pop', $fofh9im$Sherlock Holmes says "Elementary, my dear Watson" in the original stories.$fofh9im$, false, $fofk819$The exact phrase never appears in Conan Doyle's writing. It came from later adaptations.$fofk819$),
  (37, 'pop', $fofpexy$Tetris was created in the Soviet Union.$fofpexy$, true, $fofm66c$Alexey Pajitnov made it in Moscow in 1984.$fofm66c$),
  (38, 'pop', $foffc61$Pac-Man was reportedly inspired by a pizza with a slice missing.$foffc61$, true, $fof2g7o$Creator Toru Iwatani has said so.$fof2g7o$),
  (39, 'pop', $fof4wy5$Pikachu is number 1 in the Pokédex.$fof4wy5$, false, $fof6rqe$Bulbasaur is #1. Pikachu is #25.$fof6rqe$),
  (40, 'pop', $fofivad$Marvel's Black Panther first appeared in comics in 1966.$fofivad$, true, $fofg83v$He debuted in Fantastic Four #52, long before the movies.$fofg83v$),
  (41, 'pop', $fofxtth$The first iPhone was released in 2010.$fofxtth$, false, $fofzgzz$It launched in June 2007.$fofzgzz$),
  (42, 'afr', $fofivib$Lagos is the capital of Nigeria.$fofivib$, false, $fof7l69$The capital is Abuja, which replaced Lagos in 1991.$fof7l69$),
  (43, 'afr', $fof8sb4$Nigeria is the most populous country in Africa.$fof8sb4$, true, $fof9l7n$It has well over 200 million people.$fof9l7n$),
  (44, 'afr', $fofe6h1$Mount Kilimanjaro is in Kenya.$fofe6h1$, false, $fof2xat$Africa's tallest mountain is in Tanzania, though you can see it from Kenya.$fof2xat$),
  (45, 'afr', $fofp658$Wole Soyinka was the first African to win the Nobel Prize in Literature.$fofp658$, true, $fofzyfy$The Nigerian writer won it in 1986.$fofzyfy$),
  (46, 'afr', $fof5m5w$Lake Victoria is the largest lake in Africa.$fof5m5w$, true, $fofeqmr$It is shared by Uganda, Kenya and Tanzania.$fofeqmr$),
  (47, 'afr', $fof8klv$Egypt has more pyramids than any other country.$fof8klv$, false, $fofau8l$Sudan has more. Its Nubian pyramids number over 200.$fofau8l$),
  (48, 'afr', $fofr5vd$Chimamanda Ngozi Adichie wrote "Things Fall Apart".$fofr5vd$, false, $fof8t2y$That novel was written by Chinua Achebe and published in 1958.$fof8t2y$),
  (49, 'afr', $fofmujp$Ghana was the first sub-Saharan African country to gain independence from colonial rule.$fofmujp$, true, $fof9rhq$Ghana became independent from Britain in 1957.$fof9rhq$),
  (50, 'afr', $fofic6o$Fela Kuti pioneered the Afrobeat music genre.$fofic6o$, true, $fofz3n4$The Nigerian legend blended highlife, jazz and funk in the late 1960s and 70s.$fofz3n4$),
  (51, 'afr', $fofgeb7$Madagascar is the largest island in Africa.$fofgeb7$, true, $fofhpau$It is also the fourth-largest island in the world.$fofhpau$),
  (52, 'afr', $foft5hi$Timbuktu is a mythical place that does not really exist.$foft5hi$, false, $fof5mmh$It is a real city in Mali, and it was a famous centre of learning.$fof5mmh$)
on conflict (id) do update set category=excluded.category, statement=excluded.statement, answer=excluded.answer, why=excluded.why;
