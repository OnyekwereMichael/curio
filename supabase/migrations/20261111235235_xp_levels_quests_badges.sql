alter table public.users add column if not exists total_xp int not null default 0;
alter table public.users add column if not exists level int not null default 1;

create or replace function public.protect_xp_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.xp_write', true) is distinct from 'on' then
    new.total_xp := old.total_xp;
    new.level := old.level;
  end if;
  return new;
end $$;
drop trigger if exists users_protect_xp on public.users;
create trigger users_protect_xp before update on public.users
  for each row execute function public.protect_xp_columns();

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  ref_key text not null,
  amount int not null check (amount >= 0),
  ref_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, source, ref_key)
);
create index if not exists xp_events_user_created_idx on public.xp_events(user_id, created_at desc);

create table if not exists public.daily_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_date date not null,
  key text not null,
  target int not null,
  progress int not null default 0,
  completed_at timestamptz,
  xp int not null,
  primary key (user_id, quest_date, key)
);

create table if not exists public.badges (
  key text primary key,
  name text not null,
  kind text not null,
  threshold int not null,
  param text,
  color text not null default 'ink' check (color in ('ember','ink','moss','gold')),
  xp int not null default 0
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null references public.badges(key),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.xp_events enable row level security;
alter table public.daily_quests enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
create policy "Users read own xp" on public.xp_events for select using (auth.uid() = user_id);
create policy "Users read own quests" on public.daily_quests for select using (auth.uid() = user_id);
create policy "Signed-in users read badges" on public.badges for select to authenticated using (true);
create policy "Users read own badges" on public.user_badges for select using (auth.uid() = user_id);

insert into public.badges (key, name, kind, threshold, param, color, xp) values
  ('streak-7',  '7-day',        'streak',  7,   null,    'ember', 100),
  ('streak-30', '30-day',       'streak',  30,  null,    'ember', 100),
  ('streak-60', '60-day',       'streak',  60,  null,    'ember', 100),
  ('streak-100','100-day',      'streak',  100, null,    'ember', 100),
  ('first-word','First word',   'words',   1,   null,    'moss',  25),
  ('words-10',  'Ten words',    'words',   10,  null,    'moss',  25),
  ('words-50',  'Fifty words',  'words',   50,  null,    'moss',  25),
  ('first-quiz','First quiz',   'quizzes', 1,   null,    'ink',   25),
  ('perfect-quiz','Perfect score','perfect',1,  null,    'gold',  25),
  ('perfect-7', 'Perfect 7',    'perfect', 7,   null,    'gold',  25),
  ('space-fan', 'Space fan',    'topic',   3,   'Space', 'ink',   25)
on conflict (key) do nothing;

create or replace function public.sync_xp(p_date date default (now() at time zone 'utc')::date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_plan public.daily_plans%rowtype;
  v_log public.user_activity_log%rowtype;
  v_known int;
  v_xp int;
  v_level int;
  v_new text[] := '{}';
  b record;
  cnt bigint;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if abs(p_date - (now() at time zone 'utc')::date) > 1 then raise exception 'Date out of range'; end if;

  select * into v_plan from public.daily_plans where user_id = uid and plan_date = p_date;
  select count(*) into v_known from public.user_word_progress p
    where p.user_id = uid and p.marked_known and p.word_id = any(coalesce(v_plan.word_ids, '{}'));
  select * into v_log from public.user_activity_log where user_id = uid and activity_date = p_date limit 1;

  insert into public.daily_quests (user_id, quest_date, key, target, xp) values
    (uid, p_date, 'learn_words', greatest(coalesce(cardinality(v_plan.word_ids), 0), 1), 20),
    (uid, p_date, 'quiz_score', 4, 30)
  on conflict do nothing;

  update public.daily_quests q set
    target = case q.key when 'learn_words' then greatest(coalesce(cardinality(v_plan.word_ids), 0), 1) else q.target end,
    progress = least(
      case q.key
        when 'learn_words' then v_known
        when 'quiz_score' then case when coalesce(v_log.quiz_perfect, false) then 4 else coalesce(v_log.quiz_score, 0) end
        else q.progress end,
      case q.key when 'learn_words' then greatest(coalesce(cardinality(v_plan.word_ids), 0), 1) else q.target end)
  where q.user_id = uid and q.quest_date = p_date and q.completed_at is null;

  with done as (
    update public.daily_quests set completed_at = now()
    where user_id = uid and quest_date = p_date and completed_at is null and progress >= target
    returning key, xp
  )
  insert into public.xp_events (user_id, source, ref_key, amount)
  select uid, 'quest', p_date::text || ':' || key, xp from done
  on conflict do nothing;

  if coalesce(v_log.quiz_completed, false) then
    insert into public.xp_events (user_id, source, ref_key, amount)
    values (uid, 'quiz', p_date::text,
      coalesce(v_log.quiz_score, 0) * 5 + 10 + case when coalesce(v_log.quiz_perfect, false) then 15 else 0 end)
    on conflict do nothing;
  end if;

  for b in select * from public.badges
           where key not in (select badge_key from public.user_badges where user_id = uid) loop
    cnt := case b.kind
      when 'streak' then (select greatest(coalesce(current_streak, 0), coalesce(longest_streak, 0)) from public.users where id = uid)
      when 'words' then (select count(*) from public.user_word_progress where user_id = uid and marked_known)
      when 'quizzes' then (select count(*) from public.user_activity_log where user_id = uid and quiz_completed)
      when 'perfect' then (select count(*) from public.user_activity_log where user_id = uid and quiz_perfect)
      when 'topic' then (select count(*) from public.user_fact_progress p join public.facts f on f.id = p.fact_id
                         where p.user_id = uid and f.topic = b.param)
      else 0 end;
    if cnt >= b.threshold then
      insert into public.user_badges (user_id, badge_key) values (uid, b.key) on conflict do nothing;
      if b.xp > 0 then
        insert into public.xp_events (user_id, source, ref_key, amount) values (uid, 'badge', b.key, b.xp) on conflict do nothing;
      end if;
      v_new := array_append(v_new, b.key);
    end if;
  end loop;

  select coalesce(sum(amount), 0) into v_xp from public.xp_events where user_id = uid;
  v_level := floor((1 + sqrt(1 + 4.0 * v_xp / 25)) / 2)::int;
  perform set_config('app.xp_write', 'on', true);
  update public.users set total_xp = v_xp, level = v_level
    where id = uid and (total_xp is distinct from v_xp or level is distinct from v_level);
  perform set_config('app.xp_write', 'off', true);

  return jsonb_build_object('total_xp', v_xp, 'level', v_level, 'new_badges', to_jsonb(v_new));
end $$;

revoke execute on function public.sync_xp(date) from public, anon;
grant execute on function public.sync_xp(date) to authenticated;
