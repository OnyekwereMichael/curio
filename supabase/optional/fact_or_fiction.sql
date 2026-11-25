-- Fact or Fiction: multiplayer backend. Run once in the Supabase SQL editor.
-- NOT in supabase/migrations on purpose, so `supabase db push` won't apply it by accident.
--
-- Security model: players are anonymous (no accounts), so these tables are open to the anon role.
-- That is fine for a party game with throwaway rooms, but nothing sensitive may ever go in them.
-- The triggers below enforce the rules that must hold even if a client is tampered with
-- (max 8 players, no joining after start, unique names per room).

create table if not exists public.fof_rooms (
  code       text primary key check (code ~ '^[A-Z]{4}$'),
  host_id    text not null,
  status     text not null default 'lobby' check (status in ('lobby','playing','ended','closed')),
  round      int  not null default 0,
  phase      text not null default 'question' check (phase in ('question','reveal')),
  games      int  not null default 0,                    -- bumped on every start; keys the client-side round timers
  deck       jsonb not null default '[]'::jsonb,         -- statement ids in play order
  settings   jsonb not null default '{"rounds":10,"timer":15,"cats":["sci","his","ani","geo","pop","afr"]}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fof_players (
  id        text primary key,
  room_code text not null references public.fof_rooms(code) on delete cascade,
  name      text not null check (char_length(name) between 1 and 16),
  avatar    text not null,
  beat      bigint not null default 0,                   -- heartbeat token; clients watch it change to detect who left
  joined_at timestamptz not null default now()
);
create unique index if not exists fof_players_name_uq on public.fof_players (room_code, lower(name));
create index if not exists fof_players_room_idx on public.fof_players (room_code);

create table if not exists public.fof_votes (
  room_code text not null references public.fof_rooms(code) on delete cascade,
  round     int  not null,
  player_id text not null,
  choice    boolean not null,                            -- true = FACT, false = FICTION
  ms        int  not null check (ms >= 0),               -- response time measured on the player's own device
  primary key (room_code, round, player_id)
);

-- Rules enforced server-side
create or replace function public.fof_guard_player() returns trigger language plpgsql as $$
declare st text; n int;
begin
  perform pg_advisory_xact_lock(hashtext('fof:' || new.room_code));
  select status into st from public.fof_rooms where code = new.room_code;
  if st is null then raise exception 'room_missing'; end if;
  if st <> 'lobby' then raise exception 'room_started'; end if;
  select count(*) into n from public.fof_players where room_code = new.room_code;
  if n >= 8 then raise exception 'room_full'; end if;
  return new;
end $$;
drop trigger if exists fof_guard_player on public.fof_players;
create trigger fof_guard_player before insert on public.fof_players
  for each row execute function public.fof_guard_player();

-- Open access for anonymous players (see note at the top)
alter table public.fof_rooms   enable row level security;
alter table public.fof_players enable row level security;
alter table public.fof_votes   enable row level security;
do $$
declare t text;
begin
  foreach t in array array['fof_rooms','fof_players','fof_votes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_open', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', t || '_open', t);
  end loop;
end $$;

-- Realtime (full replica identity so DELETE/UPDATE events carry the old row)
alter table public.fof_rooms   replica identity full;
alter table public.fof_players replica identity full;
alter table public.fof_votes   replica identity full;
alter publication supabase_realtime add table public.fof_rooms, public.fof_players, public.fof_votes;

-- Housekeeping: rooms are throwaway. Run occasionally, or schedule with pg_cron:
--   delete from public.fof_rooms where created_at < now() - interval '1 day';
