-- Competitions (the meet calendar behind the countdown and home screen
-- widget), a hydration reminder preference, and converting stored weights
-- when a user switches between lb and kg.

-- ---------------------------------------------------------------------------
-- competitions
-- weight_class is in the user's unit, like every other weight. It defaults to
-- the profile's weight class in the app but can differ per event (for example
-- a growth allowance or wrestling up a class).
-- ---------------------------------------------------------------------------
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  starts_on date not null,
  weigh_in_at timestamptz,
  weight_class numeric(5, 1) check (weight_class > 0 and weight_class < 1000),
  location text check (char_length(location) <= 120),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.competitions is 'Upcoming and past meets: duals, tournaments, and weigh-ins.';

create index competitions_user_date_idx on public.competitions (user_id, starts_on);

create trigger competitions_set_updated_at
  before update on public.competitions
  for each row execute function public.set_updated_at();

alter table public.competitions enable row level security;

create policy "Users can view their own competitions"
  on public.competitions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own competitions"
  on public.competitions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own competitions"
  on public.competitions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own competitions"
  on public.competitions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Hydration reminder preference
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column hydration_reminders boolean not null default true;

-- ---------------------------------------------------------------------------
-- convert_weight_unit
-- Switches the caller's unit and converts every weight they have stored, in
-- one transaction, so nothing is left half converted. Runs as the caller
-- (security invoker), so row-level security still limits it to their rows.
-- Values are rounded to 0.1, so converting back and forth can drift by 0.1.
-- ---------------------------------------------------------------------------
create or replace function public.convert_weight_unit(target public.weight_unit)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_unit public.weight_unit;
  factor numeric;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select weight_unit into current_unit from public.profiles where id = uid;
  if current_unit is null or current_unit = target then
    return;
  end if;

  factor := case when target = 'kg' then 1 / 2.20462 else 2.20462 end;

  update public.weigh_ins
    set weight = round(weight * factor, 1)
    where user_id = uid;

  update public.practices
    set pre_weight = round(pre_weight * factor, 1),
        post_weight = round(post_weight * factor, 1)
    where user_id = uid;

  update public.competitions
    set weight_class = round(weight_class * factor, 1)
    where user_id = uid and weight_class is not null;

  update public.profiles
    set weight_unit = target,
        weight_class = round(weight_class * factor, 1),
        goal_weight = round(goal_weight * factor, 1)
    where id = uid;
end;
$$;

comment on function public.convert_weight_unit(public.weight_unit) is
  'Switches the caller''s weight unit and converts all of their stored weights.';

revoke execute on function public.convert_weight_unit(public.weight_unit) from public, anon;
grant execute on function public.convert_weight_unit(public.weight_unit) to authenticated;
