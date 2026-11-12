drop policy if exists "Members read rounds" on public.game_rounds;
create policy "Members read unlocked rounds" on public.game_rounds for select
  using (
    public.is_room_member(room_id)
    and round <= (select greatest(r.current_round, 1) from public.game_rooms r where r.id = room_id)
  );
