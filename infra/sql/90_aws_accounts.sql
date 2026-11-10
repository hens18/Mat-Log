-- AWS-only pieces that replace what Supabase Auth did inside the database.

/**
 * Creates the caller's auth.users row (and, through the existing trigger, their
 * profile) the first time they use the app after signing up with Cognito.
 * Safe to call on every sign-in.
 */
create or replace function public.ensure_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into auth.users (id, email)
    values (uid, auth.jwt() ->> 'email')
    on conflict (id) do update set email = excluded.email;
end;
$$;

revoke execute on function public.ensure_my_account() from public, anon;
grant execute on function public.ensure_my_account() to authenticated;
