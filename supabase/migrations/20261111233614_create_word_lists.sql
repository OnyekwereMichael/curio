create table if not exists public.word_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.word_list_items (
  list_id uuid not null references public.word_lists(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, word_id)
);

create index if not exists word_lists_user_id_idx on public.word_lists(user_id);
create index if not exists word_list_items_word_id_idx on public.word_list_items(word_id);

alter table public.word_lists enable row level security;
alter table public.word_list_items enable row level security;

create policy "Users read own lists" on public.word_lists for select using (auth.uid() = user_id);
create policy "Users create own lists" on public.word_lists for insert with check (auth.uid() = user_id);
create policy "Users update own lists" on public.word_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own lists" on public.word_lists for delete using (auth.uid() = user_id);

create policy "Users read own list items" on public.word_list_items for select
  using (exists (select 1 from public.word_lists l where l.id = list_id and l.user_id = auth.uid()));
create policy "Users add to own lists" on public.word_list_items for insert
  with check (exists (select 1 from public.word_lists l where l.id = list_id and l.user_id = auth.uid()));
create policy "Users remove from own lists" on public.word_list_items for delete
  using (exists (select 1 from public.word_lists l where l.id = list_id and l.user_id = auth.uid()));
