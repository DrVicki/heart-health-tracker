-- Heart Healthy Daily Tracker — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

-- One row per (user, date). All the day's metrics live in a single jsonb blob,
-- matching the shape the app already works with.
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists entries_user_id_date_idx
  on public.entries (user_id, date);

-- One row per user: height + medication list.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  height_cm numeric,
  medications jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every write.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Row-level security: every user can only ever see or write their own rows.
alter table public.entries enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can view own entries" on public.entries;
create policy "Users can view own entries"
  on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own entries" on public.entries;
create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own entries" on public.entries;
create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own entries" on public.entries;
create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
