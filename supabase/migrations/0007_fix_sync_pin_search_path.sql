-- Fixes "function crypt(text, text) does not exist", surfaced when devices
-- tried to submit the sync PIN added in 0006_sync_pin.sql.
--
-- Root cause: on Supabase-hosted Postgres, `create extension pgcrypto`
-- installs into the `extensions` schema, not `public`. The plain
-- `insert ... crypt(...)` statement in 0006 worked fine because it ran
-- under the connecting session's own default search_path (which includes
-- `extensions`) - but the two SECURITY DEFINER functions in that same
-- migration deliberately locked their own search_path down to just
-- `public` (a standard hardening step against search_path hijacking on
-- SECURITY DEFINER functions), which hid `extensions` - and therefore
-- crypt()/gen_salt() - from them specifically.
--
-- This only widens those two functions' search_path to include
-- `extensions` alongside `public`. It does not touch sync_blob or
-- sync_secret data in any way, and the PIN already set via 0006 is left
-- exactly as it is (still just a hash - never stored in plain text or
-- read back out here).

create or replace function public.sync_blob_get(p_pin text)
returns table (id text, store jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.sync_secret where pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'invalid pin';
  end if;
  return query
    select sb.id, sb.store, sb.updated_at
    from public.sync_blob sb
    where sb.id = '00000000-0000-0000-0000-000000000001';
end;
$$;

create or replace function public.sync_blob_upsert(p_pin text, p_store jsonb, p_updated_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.sync_secret where pin_hash = crypt(p_pin, pin_hash)
  ) then
    raise exception 'invalid pin';
  end if;
  insert into public.sync_blob (id, store, updated_at)
  values ('00000000-0000-0000-0000-000000000001', p_store, p_updated_at)
  on conflict (id) do update set store = excluded.store, updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.sync_blob_get(text) to anon, authenticated;
grant execute on function public.sync_blob_upsert(text, jsonb, timestamptz) to anon, authenticated;
