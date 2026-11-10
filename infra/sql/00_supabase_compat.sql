-- Recreates the small part of Supabase's built-in setup that Mat Log's
-- migrations rely on, so they run unchanged on plain PostgreSQL (Amazon RDS):
--   - the anon and authenticated roles, which PostgREST switches into per request
--   - an authenticator login role that PostgREST connects as
--   - auth.users (filled in by public.ensure_my_account() after a Cognito sign-in)
--   - auth.uid() and auth.jwt(), read from the JWT claims PostgREST sets per request
--   - Supabase's default grants on the public schema (row-level security still
--     decides which rows anyone can see)
-- Safe to run more than once.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    -- The migration runner sets its password from Secrets Manager.
    create role authenticator login noinherit;
  end if;
end
$$;

grant anon, authenticated to authenticator;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table auth.users is
  'One row per Cognito user (id = the Cognito sub), created by public.ensure_my_account().';

/** The JWT claims PostgREST verified for this request, or null outside a request. */
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb;
$$;

/** The signed-in user's id: the Cognito sub from the verified token. */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

grant execute on function auth.jwt(), auth.uid() to anon, authenticated;

grant usage on schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;
