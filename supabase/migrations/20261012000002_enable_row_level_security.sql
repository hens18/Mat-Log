-- Row-level security: every user can only see and change their own rows.
--
-- auth.uid() is wrapped in a subselect so Postgres evaluates it once per
-- statement instead of once per row (Supabase RLS performance guidance).
-- Policies target the authenticated role only, so anonymous requests get
-- no rows at all.

alter table public.profiles enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.practices enable row level security;
alter table public.practice_reflections enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- Rows are created by the handle_new_user trigger and removed by the
-- auth.users cascade, so users may only read and update their own row.
-- ---------------------------------------------------------------------------

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- weigh_ins
-- ---------------------------------------------------------------------------

create policy "Users can view their own weigh-ins"
  on public.weigh_ins for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own weigh-ins"
  on public.weigh_ins for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own weigh-ins"
  on public.weigh_ins for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own weigh-ins"
  on public.weigh_ins for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- practices
-- ---------------------------------------------------------------------------

create policy "Users can view their own practices"
  on public.practices for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own practices"
  on public.practices for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own practices"
  on public.practices for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own practices"
  on public.practices for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- practice_reflections
-- Writes also require that the referenced practice belongs to the same user,
-- so nobody can attach a reflection to another user's practice.
-- ---------------------------------------------------------------------------

create policy "Users can view their own reflections"
  on public.practice_reflections for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create reflections on their own practices"
  on public.practice_reflections for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.practices p
      where p.id = practice_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can update their own reflections"
  on public.practice_reflections for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.practices p
      where p.id = practice_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own reflections"
  on public.practice_reflections for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Privileges
-- Anonymous clients never need these tables, so drop the default grants.
-- handle_new_user only runs from the auth.users trigger, so nobody should be
-- able to call it directly through the API.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.weigh_ins, public.practices,
  public.practice_reflections from anon;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
