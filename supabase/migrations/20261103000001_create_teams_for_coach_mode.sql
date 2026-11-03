-- Coach mode: a coach creates a team and shares its join code; wrestlers join
-- with the code and can leave at any time. While they're on the team, the
-- coach can READ (never change) their weigh-ins, practices, competitions, and
-- weight class. Food logs, nutrition, and hydration stay private.
--
-- Membership checks live in security definer helpers so policies on one table
-- can look at another without RLS recursion.

-- ---------------------------------------------------------------------------
-- Join codes: 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
-- gen_random_uuid() draws from a strong random source, so codes are hard to guess.
-- ---------------------------------------------------------------------------
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := uuid_send(gen_random_uuid());
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return code;
end;
$$;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  join_code text not null unique default public.generate_join_code()
    check (join_code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teams is 'A coach''s team. Wrestlers join with join_code.';

create index teams_coach_idx on public.teams (coach_id);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

comment on table public.team_members is 'Wrestlers who joined a team and share their data with its coach.';

create index team_members_user_idx on public.team_members (user_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer: they read teams and team_members directly)
-- ---------------------------------------------------------------------------

/** True when the caller coaches a team the athlete is on. */
create or replace function public.coaches_athlete(athlete uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members m
    join public.teams t on t.id = m.team_id
    where m.user_id = athlete and t.coach_id = (select auth.uid())
  );
$$;

/** True when the caller coaches this team. */
create or replace function public.is_team_coach(team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teams t where t.id = team and t.coach_id = (select auth.uid())
  );
$$;

/** True when the caller is a member of this team. */
create or replace function public.is_team_member(team uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m where m.team_id = team and m.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.coaches_athlete(uuid), public.is_team_coach(uuid),
  public.is_team_member(uuid), public.generate_join_code() from public, anon;
grant execute on function public.coaches_athlete(uuid), public.is_team_coach(uuid),
  public.is_team_member(uuid), public.generate_join_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security for the new tables
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "Coaches and members can view a team"
  on public.teams for select to authenticated
  using (coach_id = (select auth.uid()) or public.is_team_member(id));
create policy "Users can create teams they coach"
  on public.teams for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy "Coaches can update their teams"
  on public.teams for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
create policy "Coaches can delete their teams"
  on public.teams for delete to authenticated
  using (coach_id = (select auth.uid()));

-- Joining only happens through join_team(), which checks the code, so there is
-- no insert policy.
create policy "Members and their coach can view memberships"
  on public.team_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_team_coach(team_id));
create policy "Members can leave and coaches can remove members"
  on public.team_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_team_coach(team_id));

-- ---------------------------------------------------------------------------
-- Read-only access for coaches to their athletes' training data
-- ---------------------------------------------------------------------------
create policy "Coaches can view their athletes' weigh-ins"
  on public.weigh_ins for select to authenticated
  using (public.coaches_athlete(user_id));
create policy "Coaches can view their athletes' practices"
  on public.practices for select to authenticated
  using (public.coaches_athlete(user_id));
create policy "Coaches can view their athletes' competitions"
  on public.competitions for select to authenticated
  using (public.coaches_athlete(user_id));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

/** Uppercases a typed code and drops spaces and dashes. */
create or replace function public.normalize_join_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

/** The team and coach behind a code, so a wrestler can see who they'd share with. */
create or replace function public.preview_team(code text)
returns table (team_id uuid, team_name text, coach_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, p.display_name
  from public.teams t
  join public.profiles p on p.id = t.coach_id
  where t.join_code = public.normalize_join_code(code)
    and (select auth.uid()) is not null;
$$;

/** Joins the team with this code. Safe to call twice. */
create or replace function public.join_team(code text)
returns table (team_id uuid, team_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  found public.teams%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select * into found from public.teams t where t.join_code = public.normalize_join_code(code);
  if found.id is null then
    raise exception 'No team has that code. Check it with your coach.' using errcode = 'P0002';
  end if;
  if found.coach_id = uid then
    raise exception 'You coach this team, so you can''t join it as a wrestler.' using errcode = '22023';
  end if;
  insert into public.team_members (team_id, user_id) values (found.id, uid)
    on conflict do nothing;
  return query select found.id, found.name;
end;
$$;

/** Teams the caller is a member of, with each coach's name. */
create or replace function public.my_teams()
returns table (team_id uuid, team_name text, coach_name text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, p.display_name, m.joined_at
  from public.team_members m
  join public.teams t on t.id = m.team_id
  join public.profiles p on p.id = t.coach_id
  where m.user_id = (select auth.uid())
  order by t.name;
$$;

/**
 * The roster for a team the caller coaches: only the profile fields a coach
 * needs (not birth year, sex, or calorie goal).
 */
create or replace function public.team_roster(team uuid)
returns table (
  user_id uuid,
  display_name text,
  weight_unit public.weight_unit,
  weight_class numeric,
  goal_weight numeric,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_team_coach(team) then
    raise exception 'Only this team''s coach can see its roster.' using errcode = '42501';
  end if;
  return query
    select p.id, p.display_name, p.weight_unit, p.weight_class, p.goal_weight, m.joined_at
    from public.team_members m
    join public.profiles p on p.id = m.user_id
    where m.team_id = team
    order by p.display_name nulls last;
end;
$$;

/** Replaces a team's join code; the old one stops working. Existing members stay. */
create or replace function public.regenerate_join_code(team uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_code text;
begin
  if not public.is_team_coach(team) then
    raise exception 'Only this team''s coach can change its code.' using errcode = '42501';
  end if;
  update public.teams set join_code = public.generate_join_code()
    where id = team
    returning join_code into next_code;
  return next_code;
end;
$$;

revoke execute on function public.normalize_join_code(text), public.preview_team(text),
  public.join_team(text), public.my_teams(), public.team_roster(uuid),
  public.regenerate_join_code(uuid) from public, anon;
grant execute on function public.normalize_join_code(text), public.preview_team(text),
  public.join_team(text), public.my_teams(), public.team_roster(uuid),
  public.regenerate_join_code(uuid) to authenticated;
