-- Lets a signed-in user permanently delete their own account from the app,
-- which the App Store requires for any app that supports account creation
-- (App Review Guideline 5.1.1(v)).
--
-- Deleting the auth.users row cascades to profiles, and from there to
-- weigh_ins, practices, and practice_reflections.

create or replace function public.delete_my_account()
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
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_my_account() is
  'Deletes the calling user and all of their data. Callable only by signed-in users.';

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
