-- Weekly prize cycle tests. Uses real tables and the real functions, fabricates XP in a long-past week,
-- then ROLLS EVERYTHING BACK (the DO block always ends by raising).
-- Success message: "ALL PRIZE CYCLE TESTS PASSED".
-- Run: paste into the Supabase SQL editor.

create or replace function pg_temp.expect_err(p_sql text, p_pattern text) returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg !~* p_pattern then raise exception 'wrong error for [%]: got "%", wanted /%/', p_sql, v_msg, p_pattern; end if;
    return;
  end;
  raise exception 'expected an error matching /%/ but [%] succeeded', p_pattern, p_sql;
end $$;

create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true)
$$;

do $test$
declare
  u uuid[]; w1 timestamptz := '2026-03-02 00:00:00+01'; w2 timestamptz := '2026-03-09 00:00:00+01';
  v_log text := ''; v_n int; v_r jsonb; v_w1 uuid; v_w2 uuid; v_w3 uuid; v_i int;
begin
  select array_agg(id) into u from (
    select id from public.users where id not in (select user_id from public.user_preferences where hide_from_board)
    order by created_at limit 6) s;
  assert cardinality(u) = 6, 'need 6 visible users';
  assert not exists (select 1 from public.xp_events where created_at >= w1 and created_at < w2 + interval '7 days'), 'test weeks must be empty';

  update public.leaderboard_config set competition_start = w1;

  -- week 1: u1 300; u2 and u3 tie on 200 (u2 got there first); u4 also 200 but later; u5 30; u6 10
  insert into public.xp_events (user_id, source, ref_key, amount, created_at) values
    (u[1], 'quest', 't1', 300, w1 + interval '1 day'),
    (u[2], 'quest', 't2', 100, w1 + interval '1 day'), (u[2], 'quest', 't2b', 100, w1 + interval '2 days'),
    (u[3], 'quest', 't3', 100, w1 + interval '1 day'), (u[3], 'quest', 't3b', 100, w1 + interval '3 days'),
    (u[4], 'quest', 't4', 200, w1 + interval '5 days'),
    (u[5], 'quest', 't5', 30,  w1 + interval '1 day'),
    (u[6], 'quest', 't6', 10,  w1 + interval '1 day');
  -- week 2: only 40 XP total (below the 50 minimum) -> no winners
  insert into public.xp_events (user_id, source, ref_key, amount, created_at) values (u[1], 'quest', 't7', 40, w2 + interval '1 day');

  -- 1. winners, ranks and the tie rule
  assert public.finalize_weekly_cycle(w1) = 1, 'week 1 should finalize';
  assert (select array_agg(user_id order by rank) from public.weekly_winners where week_start = w1) = u[1:3], 'top 3 = u1, u2, u3 (u2 beats u3 on the tie: earlier)';
  assert (select array_agg(prize_amount order by rank) from public.weekly_winners where week_start = w1) = array[2500, 1500, 1000], 'prize amounts';
  assert (select rank from public.weekly_results where week_start = w1 and user_id = u[4]) = 4, 'u4 (200 XP, later) is 4th, no prize';
  assert (select count(*) from public.weekly_results where week_start = w1) = 6, 'six ranked users';
  assert not exists (select 1 from public.weekly_winners where week_start = w1 and user_id = u[4]), 'u4 gets no prize';
  assert (select bool_and(claim_deadline between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour' and paid_status = 'pending') from public.weekly_winners where week_start = w1), 'deadline ~7 days, status pending';
  v_log := v_log || E'\n ok  winners, prizes, tie rule (earliest to reach the total), deadline';

  -- 2. idempotent
  assert public.finalize_weekly_cycle(w1) = 0, 'second run must do nothing';
  assert (select count(*) from public.weekly_winners where week_start = w1) = 3, 'still 3 winners';
  perform pg_temp.expect_err($$select public.finalize_weekly_cycle(now() - interval '1 day')$$, 'not finished');
  v_log := v_log || E'\n ok  finalizing twice is a no-op; an unfinished week is rejected';

  -- 3. minimum weekly XP
  assert public.finalize_weekly_cycle(w2) = 1;
  assert not exists (select 1 from public.weekly_winners where week_start = w2), 'below the XP minimum: no winner';
  assert (select count(*) from public.weekly_results where week_start = w2) = 1, 'but the result row exists';
  v_log := v_log || E'\n ok  nobody wins below the minimum XP';

  -- catch-up: the scheduled call with no argument closes every other finished week and leaves these alone
  assert public.finalize_weekly_cycle() > 0, 'catch-up run finalizes later weeks';
  assert (select count(*) from public.weekly_winners where week_start = w1) = 3;
  v_log := v_log || E'\n ok  scheduled run catches up on missed weeks without duplicating';

  -- 4. notifications
  assert (select count(*) from public.prize_notifications where week_start = w1 and kind = 'winner') = 3, '3 winner notifications';
  assert (select count(*) from public.prize_notifications where week_start = w1 and kind = 'results') = 3, '3 non-winner notifications';
  assert (select body from public.prize_notifications where user_id = u[1] and kind = 'winner' and week_start = w1) like '%₦2,500%', 'winner copy has the prize';
  v_log := v_log || E'\n ok  winner and non-winner notifications queued once each';

  -- 5. what each user sees
  perform pg_temp.act_as(u[4]);
  v_r := public.get_my_results();
  assert (v_r -> 'unseen' ->> 'rank')::int = 4 and (v_r -> 'unseen' ->> 'third_xp')::int = 200, 'non-winner sees rank and 3rd place XP';
  assert v_r -> 'unseen' -> 'winner' = 'null'::jsonb, 'non-winner has no winner block';
  assert jsonb_array_length(v_r -> 'claims') = 0;
  perform public.mark_results_seen(w1);
  assert public.get_my_results() -> 'unseen' = 'null'::jsonb, 'seen results do not show again';
  perform pg_temp.act_as(u[1]);
  v_r := public.get_my_results();
  assert (v_r -> 'unseen' -> 'winner' ->> 'rank')::int = 1 and jsonb_array_length(v_r -> 'claims') = 1, 'winner sees the prize and a claim';
  v_log := v_log || E'\n ok  results modal data for winner and non-winner; seen state persists';

  -- 6. payout submission rules
  select id into v_w1 from public.weekly_winners where week_start = w1 and rank = 1;
  select id into v_w2 from public.weekly_winners where week_start = w1 and rank = 2;
  select id into v_w3 from public.weekly_winners where week_start = w1 and rank = 3;
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, 'GTBank', '12345', 'Ada Obi')$$, v_w1), '10 digits');
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, '', '0123456789', 'Ada Obi')$$, v_w1), 'bank');
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, 'GTBank', '0123456789', 'A')$$, v_w1), 'account name');
  perform pg_temp.act_as(u[4]);
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, 'GTBank', '0123456789', 'Ada Obi')$$, v_w1), 'not found');
  perform pg_temp.act_as(u[1]);
  v_r := public.submit_payout_details(v_w1, 'GTBank', '0123 456 789', 'Ada  Obi');
  assert v_r ->> 'status' = 'submitted' and v_r ->> 'account_last4' = '6789';
  assert (select paid_status from public.weekly_winners where id = v_w1) = 'submitted';
  assert (select account_number from public.winner_payouts where winner_id = v_w1) = '0123456789' and (select account_name from public.winner_payouts where winner_id = v_w1) = 'Ada Obi', 'spaces cleaned';
  v_r := public.submit_payout_details(v_w1, 'Access Bank', '0123456789', 'Ada Obi');   -- correction before payment
  assert (select bank_name from public.winner_payouts where winner_id = v_w1) = 'Access Bank', 'details can be corrected until paid';
  assert public.get_my_results() -> 'claims' -> 0 ->> 'account_last4' = '6789', 'only the last 4 digits come back';
  v_log := v_log || E'\n ok  payout validation, ownership, cleaning, correction before payment, masked read-back';

  -- 7. reminders: only for winners who have not submitted; 24h once, 72h once
  update public.weekly_winners set created_at = now() - interval '25 hours' where week_start = w1;
  v_n := public.enqueue_prize_reminders();
  assert v_n = 2, 'u2 and u3 get a 24h reminder (u1 already submitted), got ' || v_n;
  assert (select count(*) from public.prize_notifications where kind = 'reminder_24h' and week_start = w1) = 2;
  assert not exists (select 1 from public.prize_notifications where kind = 'reminder_24h' and user_id = u[1]), 'no reminder once submitted';
  assert public.enqueue_prize_reminders() = 0, '24h reminder is sent once';
  update public.weekly_winners set created_at = now() - interval '73 hours' where week_start = w1;
  assert public.enqueue_prize_reminders() = 2, '72h reminder for the two still pending';
  assert public.enqueue_prize_reminders() = 0, '72h reminder is sent once';
  v_log := v_log || E'\n ok  24h / 72h reminders: only for unsubmitted winners, once each';

  -- 8. expiry
  update public.weekly_winners set claim_deadline = now() - interval '1 minute' where id = v_w3;
  assert public.enqueue_prize_reminders() = 1, 'u3 expires';
  assert (select paid_status from public.weekly_winners where id = v_w3) = 'expired';
  assert exists (select 1 from public.prize_notifications where kind = 'expired' and user_id = u[3]);
  assert (select paid_status from public.weekly_winners where id = v_w1) = 'submitted', 'submitted prizes never expire';
  perform pg_temp.act_as(u[3]);
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, 'GTBank', '0123456789', 'Chi Eze')$$, v_w3), 'no longer');
  v_log := v_log || E'\n ok  unclaimed prizes expire at the deadline; submitted ones do not';

  -- deadline enforced even before the cron expires it
  perform pg_temp.act_as(u[2]);
  update public.weekly_winners set claim_deadline = now() - interval '1 second' where id = v_w2;
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, 'GTBank', '0123456789', 'Bola Ade')$$, v_w2), 'deadline');
  update public.weekly_winners set claim_deadline = now() + interval '1 day' where id = v_w2;
  perform public.submit_payout_details(v_w2, 'GTBank', '0123456789', 'Bola Ade');

  -- 9. admin
  perform pg_temp.act_as(u[5]);
  assert not public.is_admin();
  perform pg_temp.expect_err($$select public.admin_list_winners()$$, 'not authorized');
  perform pg_temp.expect_err(format($$select public.admin_mark_paid(%L)$$, v_w1), 'not authorized');
  insert into public.admins (user_id) values (u[5]);
  assert public.is_admin();
  v_r := public.admin_list_winners('submitted');
  assert jsonb_array_length(v_r) = 2 and (v_r -> 0 ->> 'account_number') is not null, 'admin sees submitted winners with bank details';
  assert jsonb_array_length(public.admin_list_winners()) = 3;
  perform pg_temp.expect_err(format($$select public.admin_mark_paid(%L)$$, v_w3), 'not been submitted');   -- expired, never submitted
  perform public.admin_mark_paid(v_w1, 'TRX-001');
  assert (select paid_status from public.weekly_winners where id = v_w1) = 'paid' and (select payment_reference from public.weekly_winners where id = v_w1) = 'TRX-001';
  assert (select paid_by from public.weekly_winners where id = v_w1) = u[5];
  perform pg_temp.expect_err(format($$select public.admin_mark_paid(%L)$$, v_w1), 'already');
  assert exists (select 1 from public.prize_notifications where kind = 'paid' and user_id = u[1]), 'winner is told the prize was sent';
  perform pg_temp.act_as(u[1]);
  perform pg_temp.expect_err(format($$select public.submit_payout_details(%L, 'GTBank', '0123456789', 'Ada Obi')$$, v_w1), 'already been paid');
  v_log := v_log || E'\n ok  admin-only listing/marking, bank details visible to admin, paid is final and notifies the winner';

  raise exception 'ALL PRIZE CYCLE TESTS PASSED%', v_log;
end
$test$;
