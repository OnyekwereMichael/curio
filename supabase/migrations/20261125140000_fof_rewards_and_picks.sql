-- Fact or Fiction, part 2:
--   1. Winner reward: 10 XP through the normal XP engine (_award), with its anti-farming guards.
--   2. Category picks: every player picks the categories they want; the game mixes everyone's picks.

-- ───────────────────────── 1. category picks ─────────────────────────
alter table public.fof_players add column if not exists picks text[] not null default '{}';
alter table public.fof_players add column if not exists device_hash text;   -- hashed device id, used only to stop one device farming XP
alter table public.fof_rooms   add column if not exists game_no int not null default 0;

-- Everyone's picks combined. Nobody picked anything = every category.
create or replace function public._fof_cats(p_room uuid) returns text[]
language sql security definer stable set search_path = public as $$
  select case when cardinality(u) = 0 then array['sci','his','ani','geo','pop','afr'] else u end
  from (select coalesce(array_agg(distinct c order by c), '{}') as u
        from (select unnest(picks) c from public.fof_players where room_id = p_room and left_at is null) x) y;
$$;

drop function if exists public.fof_set_settings(uuid, int, int, text[]);
create or replace function public.fof_set_settings(p_room uuid, p_rounds int, p_seconds int) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can change settings'; end if;
  if r.status <> 'lobby' then return; end if;
  if p_rounds not in (5, 10, 15, 20) or p_seconds not between 10 and 30 then raise exception 'Bad settings'; end if;
  update public.fof_rooms set total_rounds = p_rounds, round_seconds = p_seconds where id = p_room;
end $$;

create or replace function public.fof_set_picks(p_room uuid, p_picks text[]) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms;
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  if r.status <> 'lobby' then return; end if;
  if exists (select 1 from unnest(coalesce(p_picks, '{}')) c where c not in ('sci','his','ani','geo','pop','afr')) then
    raise exception 'Unknown category';
  end if;
  update public.fof_players
    set picks = (select coalesce(array_agg(distinct c order by c), '{}') from unnest(coalesce(p_picks, '{}')) c)
    where room_id = p_room and user_id = auth.uid();
end $$;

create or replace function public.fof_start(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.fof_rooms; v_deck int[]; v_cats text[];
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can start the game'; end if;
  if r.status <> 'lobby' then return; end if;
  if (select count(*) from public.fof_players where room_id = p_room and left_at is null) < 2 then
    raise exception 'Need at least 2 players';
  end if;
  v_cats := public._fof_cats(p_room);
  -- shuffled per game: each statement appears at most once
  select coalesce(array_agg(id), '{}') into v_deck from (
    select id from public.fof_statements where category = any (v_cats) order by random() limit r.total_rounds
  ) s;
  if cardinality(v_deck) = 0 then raise exception 'No statements in those categories'; end if;
  delete from public.fof_votes where room_id = p_room;
  update public.fof_players set score = 0, streak = 0, voted_round = 0 where room_id = p_room;
  update public.fof_rooms set status = 'playing', phase = 'question', current_round = 1, deck = v_deck, categories = v_cats,
    total_rounds = cardinality(v_deck), round_started_at = now(), reveal_at = null, game_no = game_no + 1 where id = p_room;
end $$;

-- remember which device a player votes from (hashed), for the XP guard below
create or replace function public.fof_vote(p_room uuid, p_round int, p_choice boolean, p_ms int) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; n int;
  v_dev text := public._xp_hash(coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb) ->> 'x-device-id');
begin
  select * into r from public.fof_rooms where id = p_room for update;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  if r.status <> 'playing' or r.phase <> 'question' or r.current_round <> p_round then raise exception 'Too late'; end if;
  if now() > r.round_started_at + make_interval(secs => r.round_seconds + 4) then raise exception 'Too late'; end if;
  insert into public.fof_votes (room_id, round, user_id, choice, ms)
  values (p_room, p_round, uid, p_choice, greatest(0, least(coalesce(p_ms, 0), r.round_seconds * 1000)))
  on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    update public.fof_players set voted_round = p_round, device_hash = coalesce(v_dev, device_hash)
      where room_id = p_room and user_id = uid;
  end if;
end $$;

-- ───────────────────────── 2. winner reward ─────────────────────────
-- 10 XP is the most the ledger accepts per event. Settings live in xp_rules / xp_settings, so they can be tuned without code:
--   xp_rules.fof_win.amount (max 10) · xp_settings.cap_party (max XP a day from party games) · xp_settings.fof_min_players
insert into public.xp_rules (rule, ledger_source, amount, amount_from_ctx, per, counts_toward_ceiling, needs_timing, enabled, description, effective_from, cap_group)
values ('fof_win', 'party', 10, false, 'once', true, false, true,
        'Fact or Fiction: win a full game (needs enough real players), once per game, capped per day', null, 'party')
on conflict (rule) do nothing;
insert into public.xp_settings (key, value, description) values
  ('cap_party', '20'::jsonb, 'Most XP a player can earn per Lagos day from party-game wins (two wins at 10 XP)'),
  ('fof_min_players', '3'::jsonb, 'Fact or Fiction pays XP only when at least this many players actually played')
on conflict (key) do nothing;

-- Each winner claims their own reward, so the XP engine records the winner's own device, not the host's.
create or replace function public.fof_claim_reward(p_room uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); r public.fof_rooms; me public.fof_players; best int; half int;
  need int := coalesce(public._xp_cfg('fof_min_players'), 3)::int;
  n_part int; n_dev int; n_dev_known int; my_votes int;
begin
  select * into r from public.fof_rooms where id = p_room;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  if r.status <> 'finished' then return jsonb_build_object('awarded', 0, 'reason', 'not_finished'); end if;

  select * into me from public.fof_players where room_id = p_room and user_id = uid;
  select max(score) into best from public.fof_players where room_id = p_room and left_at is null;
  if coalesce(best, 0) <= 0 or me.score < best then return jsonb_build_object('awarded', 0, 'reason', 'not_winner'); end if;

  half := ceil(r.total_rounds / 2.0)::int;
  select count(*) into my_votes from public.fof_votes where room_id = p_room and user_id = uid;
  if my_votes < half then return jsonb_build_object('awarded', 0, 'reason', 'not_enough_answers', 'winner', true); end if;

  -- players who really took part: answered at least half of the rounds
  select count(*), count(distinct p.device_hash), count(p.device_hash) into n_part, n_dev, n_dev_known
  from public.fof_players p
  where p.room_id = p_room and p.left_at is null
    and (select count(*) from public.fof_votes v where v.room_id = p.room_id and v.user_id = p.user_id) >= half;
  if n_part < need then return jsonb_build_object('awarded', 0, 'reason', 'party_too_small', 'winner', true, 'need', need); end if;
  if n_dev_known >= 2 and n_dev < 2 then return jsonb_build_object('awarded', 0, 'reason', 'same_device', 'winner', true); end if;

  return public._award(uid, 'fof_win', p_room::text || ':' || r.game_no,
           jsonb_build_object('item_id', p_room::text, 'is_correct', true)) || jsonb_build_object('winner', true);
end $$;

-- ───────────────────────── state: now carries picks, game number and the reward ─────────────────────────
create or replace function public.fof_get_state(p_room uuid) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare uid uuid := auth.uid(); r public.fof_rooms; st public.fof_statements; v_round jsonb := null; v_mine boolean; v_cats text[];
begin
  select * into r from public.fof_rooms where id = p_room;
  if not found or not public.fof_is_member(p_room) then raise exception 'You are not in this room'; end if;
  v_cats := case when r.status = 'lobby' then public._fof_cats(p_room) else r.categories end;

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
      'current_round', r.current_round, 'total_rounds', r.total_rounds, 'round_seconds', r.round_seconds, 'game_no', r.game_no,
      'categories', v_cats, 'round_started_at', r.round_started_at, 'reveal_at', r.reveal_at),
    'players', coalesce((select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.name, 'avatar', p.avatar,
        'score', p.score, 'streak', p.streak, 'voted', p.voted_round = r.current_round and r.current_round > 0,
        'active', public._fof_active(p.room_id, p.user_id), 'picks', p.picks) order by p.joined_at)
      from public.fof_players p where p.room_id = p_room and p.left_at is null), '[]'::jsonb),
    'round', v_round,
    'my_choice', v_mine,
    'pool', (select count(*) from public.fof_statements where category = any (v_cats)),
    'reward', (select jsonb_build_object('amount', x.amount, 'min_players', coalesce(public._xp_cfg('fof_min_players'), 3)::int)
               from public.xp_rules x where x.rule = 'fof_win' and x.enabled and x.amount > 0
                 and (x.effective_from is null or x.effective_from <= now()))
  );
end $$;

do $$
declare f text;
begin
  foreach f in array array['fof_set_settings(uuid,int,int)', 'fof_set_picks(uuid,text[])', 'fof_claim_reward(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public._fof_cats(uuid) from public, anon;
end $$;
