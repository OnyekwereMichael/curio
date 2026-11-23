-- When a winner is rejected or disqualified their place now stays EMPTY. Nobody moves up and the prize
-- is not handed to the next player. (Before, the next eligible player was promoted into the slot and
-- inherited the prize, e.g. 4th place suddenly held the 1st-place money.)

create or replace function public.admin_review_winner(p_winner uuid, p_decision text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  wn public.weekly_winners%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_decision not in ('approved', 'rejected', 'disqualified') then raise exception 'Unknown decision'; end if;
  if p_decision = 'disqualified' and char_length(btrim(coalesce(p_notes, ''))) < 5 then
    raise exception 'Give a reason for the disqualification';
  end if;
  select * into wn from public.weekly_winners where id = p_winner for update;
  if not found then raise exception 'Winner not found'; end if;
  if wn.paid_status = 'paid' then raise exception 'This prize is already paid; it can no longer be changed'; end if;

  insert into public.winner_review_decisions (week_start, user_id, status, notes, reviewed_by)
  values (wn.week_start, wn.user_id, p_decision, p_notes, auth.uid())
  on conflict (week_start, user_id) do update set status = excluded.status, notes = excluded.notes, reviewed_by = excluded.reviewed_by, reviewed_at = now();
  perform public._admin_audit('winner_' || p_decision,
    jsonb_build_object('winner_id', wn.id, 'user_id', wn.user_id, 'week_start', wn.week_start, 'rank', wn.rank),
    jsonb_build_object('notes', p_notes, 'xp', wn.xp));

  if p_decision = 'approved' then
    update public.weekly_winners set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes,
           claim_deadline = now() + interval '7 days',
           paid_status = case when paid_status in ('void', 'expired') then 'pending' else paid_status end
     where id = wn.id;
    insert into public.prize_notifications (user_id, week_start, winner_id, kind, title, body)
    values (wn.user_id, wn.week_start, wn.id, 'winner', 'You finished ' || public._ordinal(wn.rank) || ' this week! 🏆',
            'You won ' || public._fmt_prize(wn.prize_amount, wn.currency) || '. Submit your payout details by '
              || public._fmt_deadline(now() + interval '7 days') || ' to claim it.')
    on conflict do nothing;
    return jsonb_build_object('status', 'approved');
  end if;

  -- rejected / disqualified: keep a full record and leave the place empty (no one is promoted)
  insert into public.winner_review_log (week_start, snapshot, reason, created_by)
  values (wn.week_start, to_jsonb(wn) || jsonb_build_object('payout', (select to_jsonb(po) from public.winner_payouts po where po.winner_id = wn.id)),
          p_decision || ': ' || coalesce(p_notes, ''), auth.uid());
  delete from public.winner_payouts where winner_id = wn.id;
  update public.prize_notifications set status = 'skipped' where winner_id = wn.id and status = 'pending';
  insert into public.prize_notifications (user_id, week_start, kind, title, body)
  select wn.user_id, wn.week_start, 'results', 'This week''s results are in', 'Thanks for playing this week. See how the week went.'
  on conflict do nothing;

  -- make sure the disqualification notice pops up even if they had already dismissed this week's result
  if p_decision = 'disqualified' then
    update public.weekly_results set seen_at = null where week_start = wn.week_start and user_id = wn.user_id;
  end if;

  update public.weekly_winners set review_status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes, paid_status = 'void'
   where id = wn.id;
  perform public._admin_audit('winner_place_unfilled', jsonb_build_object('winner_id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank), null);
  return jsonb_build_object('status', p_decision, 'promoted_user', null);
end $$;

-- One-time repair of this week's 1st place, which the old rule had handed to the 4th-place player.
-- Puts the slot back on the disqualified player as void, so 1st place stays empty. Guarded so it only
-- acts if the slot is still sitting with that promoted, still-unreviewed player.
do $$
declare
  v_winner uuid := '6220a11e-d048-4289-a933-5b665f7fc387';
  v_dq uuid := 'bdd4f3b7-cd6d-4ff8-9893-9b8f1aaa10b0';
  v_promoted uuid := (select id from public.users where email = 'ovoitefa@gmail.com');
  d public.winner_review_decisions%rowtype;
begin
  select * into d from public.winner_review_decisions
   where week_start = '2026-11-15 23:00:00+00' and user_id = v_dq and status = 'disqualified';
  if not found or v_promoted is null then return; end if;

  update public.weekly_winners
     set user_id = v_dq, xp = 246, reached_at = '2026-11-22 11:03:46.716622+00',
         review_status = 'disqualified', reviewed_by = d.reviewed_by, reviewed_at = d.reviewed_at, review_notes = d.notes,
         paid_status = 'void', submitted_at = null, paid_at = null, paid_by = null, payment_reference = null
   where id = v_winner and user_id = v_promoted and review_status = 'pending';

  if found then
    -- the promoted player was never told; give them back the normal "results are in" message
    update public.prize_notifications set status = 'pending'
     where user_id = v_promoted and week_start = '2026-11-15 23:00:00+00' and kind = 'results' and status = 'skipped';
    insert into public.admin_audit_log (admin_id, action, target, detail)
    values (d.reviewed_by, 'winner_promotion_reverted',
            jsonb_build_object('winner_id', v_winner, 'week_start', '2026-11-15 23:00:00+00', 'rank', 1),
            jsonb_build_object('removed_from_prize', v_promoted, 'note', 'first place left empty after disqualification'));
  end if;
end $$;
