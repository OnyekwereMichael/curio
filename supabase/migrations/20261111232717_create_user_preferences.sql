-- Onboarding + learning plan. One row per user, written step-by-step by the
-- onboarding wizard and edited later from Settings > My learning plan.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  word_style text,
  level text,
  words_per_day int not null default 3 check (words_per_day in (1, 3, 5)),
  fact_topics text[] not null default '{}',
  weekly_goal int not null default 5 check (weekly_goal in (3, 5, 7)),
  reminder_time text,
  timezone text,
  evening_nudge boolean not null default true,
  weekly_recap_email boolean not null default false,
  hide_from_board boolean not null default false,
  onboarded_at timestamptz,
  pending jsonb,
  pending_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users read own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_user_preferences()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger user_preferences_touch
  before update on public.user_preferences
  for each row execute function public.touch_user_preferences();
