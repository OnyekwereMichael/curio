-- Disqualifying a winner now needs a reason, and the player sees it (plus "check your email") the next
-- time they open the app. The reason is the admin's `notes`, stored on winner_review_decisions.
-- Only the player it is about can read it (get_my_results is keyed on auth.uid()).

create or replace function public.admin_review_winner(p_winner uuid, p_decision text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  wn public.weekly_winners%rowtype;
  v_next public.weekly_results%rowtype;
  v_min int; v_promoted uuid;
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

  select c.min_weekly_xp into v_min from public.weekly_cycles c where c.week_start = wn.week_start;
  select r.* into v_next from public.weekly_results r
   where r.week_start = wn.week_start and r.xp >= coalesce(v_min, 0)
     and r.user_id not in (select user_id from public.weekly_winners where week_start = wn.week_start)
     and r.user_id not in (select user_id from public.winner_review_decisions where week_start = wn.week_start and status in ('rejected', 'disqualified'))
     and r.user_id not in (select user_id from public.xp_excluded_users)
   order by r.rank limit 1;

  if found then
    v_promoted := v_next.user_id;
    update public.weekly_winners set user_id = v_next.user_id, xp = v_next.xp, reached_at = v_next.reached_at,
           review_status = 'pending', reviewed_by = null, reviewed_at = null, review_notes = null,
           paid_status = 'pending', submitted_at = null, paid_at = null, paid_by = null, payment_reference = null,
           reminder_24h_at = null, reminder_72h_at = null, claim_deadline = now() + interval '7 days'
     where id = wn.id;
    update public.prize_notifications set status = 'skipped'
     where user_id = v_promoted and week_start = wn.week_start and kind = 'results' and status = 'pending';
    perform public._admin_audit('winner_promoted', jsonb_build_object('winner_id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank),
                                jsonb_build_object('replaced', wn.user_id, 'promoted', v_promoted, 'xp', v_next.xp));
  else
    update public.weekly_winners set review_status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes, paid_status = 'void'
     where id = wn.id;
    perform public._admin_audit('winner_place_unfilled', jsonb_build_object('winner_id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank), null);
  end if;
  return jsonb_build_object('status', p_decision, 'promoted_user', v_promoted);
end $$;

create or replace function public.get_my_results()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_unseen jsonb; v_claims jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;

  select jsonb_build_object(
      'week_start', r.week_start, 'week_end', c.week_end, 'rank', r.rank, 'xp', r.xp,
      'participants', c.participants, 'min_weekly_xp', c.min_weekly_xp, 'currency', c.currency,
      'third_xp', (select t.xp from public.weekly_results t where t.week_start = r.week_start and t.rank = 3),
      'winner', (select jsonb_build_object('id', wn.id, 'rank', wn.rank, 'prize_amount', wn.prize_amount,
                         'currency', wn.currency, 'status', wn.paid_status, 'claim_deadline', wn.claim_deadline)
                 from public.weekly_winners wn where wn.week_start = r.week_start and wn.user_id = uid and wn.review_status = 'approved'),
      'removal', (select jsonb_build_object('reason', d.notes)
                  from public.winner_review_decisions d
                  where d.week_start = r.week_start and d.user_id = uid and d.status = 'disqualified'))
    into v_unseen
  from public.weekly_results r join public.weekly_cycles c on c.week_start = r.week_start
  where r.user_id = uid and r.seen_at is null and c.finalized_at > now() - interval '21 days'
    and not exists (select 1 from public.weekly_winners p where p.week_start = r.week_start and p.user_id = uid and p.review_status = 'pending')
  order by exists (select 1 from public.weekly_winners x where x.week_start = r.week_start and x.user_id = uid and x.review_status = 'approved') desc,
           exists (select 1 from public.winner_review_decisions z where z.week_start = r.week_start and z.user_id = uid and z.status = 'disqualified') desc,
           r.week_start desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', wn.id, 'week_start', wn.week_start, 'rank', wn.rank, 'xp', wn.xp,
           'prize_amount', wn.prize_amount, 'currency', wn.currency, 'status', wn.paid_status,
           'claim_deadline', wn.claim_deadline, 'submitted_at', wn.submitted_at, 'paid_at', wn.paid_at,
           'bank_name', po.bank_name, 'account_last4', right(po.account_number, 4), 'account_name', po.account_name
         ) order by wn.week_start desc), '[]'::jsonb)
    into v_claims
  from public.weekly_winners wn
  left join public.winner_payouts po on po.winner_id = wn.id
  where wn.user_id = uid and wn.review_status = 'approved' and wn.created_at > now() - interval '60 days'
    and wn.paid_status in ('pending', 'submitted', 'paid', 'expired');

  return jsonb_build_object('unseen', v_unseen, 'claims', v_claims);
end $$;
