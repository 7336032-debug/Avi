-- Locks down sync_blob (added in 0005) so the public anon/publishable key
-- alone - visible to anyone who opens the site's JS bundle, along with the
-- fixed row id it was scoped to - is no longer enough to read or write the
-- household's data. A PIN, entered once per device and kept only in that
-- device's own localStorage (never committed to this repo or shipped in
-- the client bundle), is now required on every read and write too.
--
-- This does NOT touch any existing data: sync_blob's row (or the six
-- original relational tables) is left exactly as it is. It only replaces
-- *how* that row can be reached - direct table access is revoked from
-- anon/authenticated, and two security-definer functions become the only
-- way in, each checking the PIN (hashed, via pgcrypto) before doing
-- anything.

create extension if not exists pgcrypto;

create table if not exists public.sync_secret (
  id boolean primary key default true,
  pin_hash text not null,
  constraint sync_secret_singleton check (id)
);

alter table public.sync_secret enable row level security;
-- Deliberately no policies here at all: this table is unreachable via the
-- anon/publishable key, direct or otherwise - only the security-definer
-- functions below (running as this migration's owner, not as anon) can
-- ever read it.

insert into public.sync_secret (id, pin_hash)
values (true, crypt('REPLACE_WITH_SYNC_PIN', gen_salt('bf')))
on conflict (id) do update set pin_hash = excluded.pin_hash;

-- Replace the old id-only anon policies from 0005 (which let anyone with
-- the public anon key read/write the row directly, no further check) with
-- RLS that denies anon/authenticated entirely - the two functions below
-- are now the only path in.
drop policy if exists sync_blob_select_household on public.sync_blob;
drop policy if exists sync_blob_insert_household on public.sync_blob;
drop policy if exists sync_blob_update_household on public.sync_blob;

revoke all on public.sync_blob from anon, authenticated;
revoke all on public.sync_secret from anon, authenticated;

create or replace function public.sync_blob_get(p_pin text)
returns table (id text, store jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
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
set search_path = public
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

revoke execute on function public.sync_blob_get(text) from public;
revoke execute on function public.sync_blob_upsert(text, jsonb, timestamptz) from public;
grant execute on function public.sync_blob_get(text) to anon, authenticated;
grant execute on function public.sync_blob_upsert(text, jsonb, timestamptz) to anon, authenticated;
