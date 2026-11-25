-- Users who saved a plan in Settings but never finished onboarding (onboarded_at is null) were treated as
-- "not personalised": get_or_build_daily_plan ignored words_per_day and handed them the single publish_date word.
-- A saved user_preferences row is now enough: Home always shows exactly words_per_day words.
do $$
declare d text; n text;
  sig regprocedure := 'public.get_or_build_daily_plan(date)'::regprocedure;
begin
  d := pg_get_functiondef(sig);
  n := replace(d, 'personalised := found and prefs.onboarded_at is not null;', 'personalised := found;');
  if n = d then
    if position('personalised := found;' in d) > 0 then return; end if; -- already applied
    raise exception 'patch anchor not found in get_or_build_daily_plan';
  end if;
  execute n;
end $$;
-- Plans already built today are topped up on the next read (words already shown stay put).
