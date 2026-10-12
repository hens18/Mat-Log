-- Mat Log core schema: profiles, weigh-ins, practices, practice reflections.
-- Weights are stored in the user's preferred unit (profiles.weight_unit) with
-- one decimal place, which is the precision of a typical wrestling scale.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.weigh_in_kind as enum (
  'morning',
  'pre_practice',
  'post_practice',
  'night'
);

create type public.weight_unit as enum ('lb', 'kg');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  weight_unit public.weight_unit not null default 'lb',
  weight_class numeric(5, 1) check (weight_class > 0),
  goal_weight numeric(5, 1) check (goal_weight > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user settings, keyed by auth.users.id.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- weigh_ins: a single scale reading
-- ---------------------------------------------------------------------------

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  weight numeric(5, 1) not null check (weight > 0 and weight < 1000),
  kind public.weigh_in_kind not null,
  recorded_at timestamptz not null default now(),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.weigh_ins is 'Scale readings, tagged by time of day.';

-- Trend chart and stats queries read a user's weigh-ins ordered by time.
create index weigh_ins_user_recorded_at_idx
  on public.weigh_ins (user_id, recorded_at desc);

create trigger weigh_ins_set_updated_at
  before update on public.weigh_ins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- practices: a single practice session with before/after weights
-- ---------------------------------------------------------------------------

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  practice_date date not null default current_date,
  duration_minutes integer check (duration_minutes > 0 and duration_minutes <= 600),
  intensity smallint check (intensity between 1 and 5),
  pre_weight numeric(5, 1) check (pre_weight > 0 and pre_weight < 1000),
  post_weight numeric(5, 1) check (post_weight > 0 and post_weight < 1000),
  -- Positive when weight was lost; null until both weights are recorded.
  weight_lost numeric(5, 1) generated always as (pre_weight - post_weight) stored,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.practices is 'Practice sessions with pre/post weights.';
comment on column public.practices.weight_lost is
  'pre_weight - post_weight, computed by Postgres. Null if either weight is missing.';

create index practices_user_date_idx
  on public.practices (user_id, practice_date desc);

create trigger practices_set_updated_at
  before update on public.practices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- practice_reflections: a short journal entry about one practice
-- ---------------------------------------------------------------------------

create table public.practice_reflections (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null unique
    references public.practices (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  went_well text check (char_length(went_well) <= 2000),
  to_improve text check (char_length(to_improve) <= 2000),
  focus_next text check (char_length(focus_next) <= 2000),
  energy smallint check (energy between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.practice_reflections is 'One reflection per practice.';

create index practice_reflections_user_idx
  on public.practice_reflections (user_id);

create trigger practice_reflections_set_updated_at
  before update on public.practice_reflections
  for each row execute function public.set_updated_at();
