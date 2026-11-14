-- Food library and post-practice hydration:
--   custom_foods    foods a user creates once and logs again by serving
--   favorite_foods  starred foods from any source, stored as a snapshot so
--                   they open without hitting the food database again
--   saved_meals     a group of foods logged together in one tap
--   hydration_logs  drinks after a practice, with their electrolytes
-- Every table is private to its owner through row-level security.

-- ---------------------------------------------------------------------------
-- custom_foods
-- Nutrition is per serving. serving_grams is optional; with it, the app can
-- offer gram and ounce servings too.
-- ---------------------------------------------------------------------------
create table public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  brand text check (char_length(brand) <= 80),
  serving_label text not null check (char_length(serving_label) between 1 and 60),
  serving_grams numeric(7, 2) check (serving_grams > 0 and serving_grams <= 5000),
  calories integer not null check (calories between 0 and 10000),
  protein_g numeric(5, 1) check (protein_g >= 0 and protein_g < 1000),
  carbs_g numeric(5, 1) check (carbs_g >= 0 and carbs_g < 1000),
  fat_g numeric(5, 1) check (fat_g >= 0 and fat_g < 1000),
  micros jsonb check (micros is null or jsonb_typeof(micros) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_foods_user_idx on public.custom_foods (user_id, name);

create trigger custom_foods_set_updated_at
  before update on public.custom_foods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- favorite_foods
-- food_key matches the app's food keys, like "usda:2187885" or "custom:<id>".
-- ---------------------------------------------------------------------------
create table public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  food_key text not null check (char_length(food_key) between 1 and 200),
  item jsonb not null check (jsonb_typeof(item) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, food_key)
);

-- ---------------------------------------------------------------------------
-- saved_meals
-- items is an array of food entries in the same shape as food_logs rows
-- (name, calories, macros, servings, micros, and so on).
-- ---------------------------------------------------------------------------
create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  items jsonb not null check (
    jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index saved_meals_user_idx on public.saved_meals (user_id, name);

create trigger saved_meals_set_updated_at
  before update on public.saved_meals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Hydration
-- Sweat loss = weight lost + fluid drunk during practice, so practices can
-- record that fluid. Drinks afterward go in hydration_logs.
-- ---------------------------------------------------------------------------
alter table public.practices
  add column fluid_during_ml integer check (fluid_during_ml between 0 and 10000);

create table public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  volume_ml integer not null check (volume_ml between 0 and 5000),
  sodium_mg integer not null default 0 check (sodium_mg between 0 and 10000),
  potassium_mg integer not null default 0 check (potassium_mg between 0 and 10000),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index hydration_logs_practice_idx on public.hydration_logs (practice_id, logged_at);
create index hydration_logs_user_idx on public.hydration_logs (user_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.custom_foods enable row level security;
alter table public.favorite_foods enable row level security;
alter table public.saved_meals enable row level security;
alter table public.hydration_logs enable row level security;

create policy "Users can view their own custom foods"
  on public.custom_foods for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own custom foods"
  on public.custom_foods for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own custom foods"
  on public.custom_foods for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own custom foods"
  on public.custom_foods for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own favorites"
  on public.favorite_foods for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own favorites"
  on public.favorite_foods for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own favorites"
  on public.favorite_foods for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own favorites"
  on public.favorite_foods for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own saved meals"
  on public.saved_meals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own saved meals"
  on public.saved_meals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own saved meals"
  on public.saved_meals for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own saved meals"
  on public.saved_meals for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Writes also require that the practice belongs to the same user.
create policy "Users can view their own hydration logs"
  on public.hydration_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can log hydration on their own practices"
  on public.hydration_logs for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.practices p
      where p.id = practice_id and p.user_id = (select auth.uid())
    )
  );
create policy "Users can update their own hydration logs"
  on public.hydration_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.practices p
      where p.id = practice_id and p.user_id = (select auth.uid())
    )
  );
create policy "Users can delete their own hydration logs"
  on public.hydration_logs for delete to authenticated
  using ((select auth.uid()) = user_id);
