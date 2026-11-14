-- Calorie tracking: one row per food a user logs, plus a daily calorie goal
-- on the profile. Macros are optional so a quick "calories only" entry works.

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

alter table public.profiles
  add column calorie_goal integer check (calorie_goal between 500 and 10000);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  logged_on date not null default current_date,
  meal public.meal_type not null,
  name text not null check (char_length(name) between 1 and 120),
  calories integer not null check (calories between 0 and 10000),
  protein_g numeric(5, 1) check (protein_g >= 0 and protein_g < 1000),
  carbs_g numeric(5, 1) check (carbs_g >= 0 and carbs_g < 1000),
  fat_g numeric(5, 1) check (fat_g >= 0 and fat_g < 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.food_logs is 'Foods logged for calorie and macro tracking.';

-- The Fuel screen reads one user's entries for a range of days.
create index food_logs_user_day_idx on public.food_logs (user_id, logged_on desc);

create trigger food_logs_set_updated_at
  before update on public.food_logs
  for each row execute function public.set_updated_at();

-- Same ownership rules as the other tables: users only touch their own rows.
alter table public.food_logs enable row level security;

create policy "Users can view their own food logs"
  on public.food_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own food logs"
  on public.food_logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own food logs"
  on public.food_logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own food logs"
  on public.food_logs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.food_logs from anon;
