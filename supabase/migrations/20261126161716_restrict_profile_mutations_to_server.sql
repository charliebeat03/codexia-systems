-- Keep profile authorization metadata writable only through trusted server-side Auth Admin APIs.
-- Auth signup/email-sync triggers run as SECURITY DEFINER and continue to maintain profiles.
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_insert_admin_only on public.profiles;
revoke insert, update, delete on table public.profiles from anon, authenticated;
