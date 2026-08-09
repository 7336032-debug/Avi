-- Adds automatic, login-free cross-device sync (replacing the earlier
-- Google Drive-based sync, which required an OAuth popup on every device).
--
-- This app has exactly one real owner across all her devices, so instead of
-- per-user Supabase Auth accounts, this adds a single new table holding one
-- row per "household" - a full JSON snapshot of this app's local data (see
-- src/lib/local/store.ts's `Store` type) plus the timestamp it was last
-- changed. Every device reads/writes that one row directly with the public
-- anon API key (no sign-in), and picks push vs. pull by comparing its own
-- local timestamp against the row's `updated_at` - the same safe,
-- already-proven direction-aware logic the Google Drive sync used (see
-- src/lib/local/useGoogleSync.ts), just swapping Drive's file API for a
-- Postgres row.
--
-- This does NOT touch any of the six existing relational tables
-- (treatments, treatment_log, product_sales, expense_categories, expenses,
-- weekly_goals) or their data/policies in any way - it only adds a new,
-- separate table. Nothing existing is altered, dropped, or overwritten.

create table if not exists public.sync_blob (
  id text primary key,
  store jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.sync_blob enable row level security;

-- Scoped to a single fixed row id (matching this app's existing
-- LOCAL_USER_ID constant, reused here as the "household" row id) rather than
-- open to any row, so the anon key can only ever read/write this app's one
-- sync row - not an unbounded table.
drop policy if exists sync_blob_select_household on public.sync_blob;
drop policy if exists sync_blob_insert_household on public.sync_blob;
drop policy if exists sync_blob_update_household on public.sync_blob;

create policy sync_blob_select_household on public.sync_blob
  for select using (id = '00000000-0000-0000-0000-000000000001');

create policy sync_blob_insert_household on public.sync_blob
  for insert with check (id = '00000000-0000-0000-0000-000000000001');

create policy sync_blob_update_household on public.sync_blob
  for update using (id = '00000000-0000-0000-0000-000000000001')
  with check (id = '00000000-0000-0000-0000-000000000001');

-- No delete policy: devices only ever read/insert/update this one row, and
-- deliberately can never delete it via the anon key.
