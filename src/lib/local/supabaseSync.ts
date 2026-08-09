// Automatic cross-device sync via Supabase, storing the whole local `Store`
// (see ./store.ts) as one JSON snapshot row, synced with timestamp-based
// push/pull direction (see useSupabaseSync.ts). See
// supabase/migrations/0005_sync_blob.sql for the table this talks to, and
// 0006_sync_pin.sql for the PIN check enforced below.
//
// There is no sign-in *screen*, but there is a PIN gate: the anon/publishable
// key is safe to ship in client code, but on its own it used to be enough to
// read/write the shared row directly (the row id it was scoped to is also
// visible in this same bundle, so RLS-by-id alone doesn't hide anything from
// a stranger with the URL). Direct table access is now revoked - reads and
// writes only work through the sync_blob_get/sync_blob_upsert Postgres
// functions, which check a PIN (hashed server-side, never shipped here)
// before touching anything. Each device enters that PIN once and it's kept
// only in that device's own localStorage (see ./syncPin.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LOCAL_USER_ID, type Row, type Store } from "./store";
import { getSyncPin } from "./syncPin";

const SUPABASE_URL = "https://bwfsbmkyiiqlrhbuyhpy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ljf2NgSqjMPcScyibIvv0Q_coW_TyRC";

export class SyncPinRequiredError extends Error {
  constructor() {
    super("צריך להזין קוד סנכרון במכשיר הזה");
    this.name = "SyncPinRequiredError";
  }
}

export class SyncPinInvalidError extends Error {
  constructor() {
    super("קוד הסנכרון שגוי");
    this.name = "SyncPinInvalidError";
  }
}

function requirePin(): string {
  const pin = getSyncPin();
  if (!pin) throw new SyncPinRequiredError();
  return pin;
}

// The single shared row's id - reusing the same constant this app already
// uses as its local-only "implicit user" id, now doubling as the
// "household" sync row id.
export const SYNC_ROW_ID = LOCAL_USER_ID;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export interface SyncBlobRow {
  id: string;
  store: unknown;
  updated_at: string;
}

function friendlyFetchError(): Error {
  return new Error("אין חיבור לאינטרנט - הנתונים יסתנכרנו כשהחיבור יחזור");
}

function rethrowPinAware(err: unknown): never {
  if (err instanceof SyncPinRequiredError || err instanceof SyncPinInvalidError) throw err;
  if (err instanceof Error && err.message) throw err;
  throw friendlyFetchError();
}

export async function readSyncRow(): Promise<SyncBlobRow | null> {
  const pin = requirePin();
  try {
    const { data, error } = await getClient().rpc("sync_blob_get", { p_pin: pin });
    if (error) {
      if (/invalid pin/i.test(error.message)) throw new SyncPinInvalidError();
      throw new Error(error.message);
    }
    const row = Array.isArray(data) ? data[0] : data;
    return (row as SyncBlobRow | undefined) ?? null;
  } catch (err) {
    rethrowPinAware(err);
  }
}

export async function writeSyncRow(store: unknown, updatedAt: string): Promise<void> {
  const pin = requirePin();
  try {
    const { error } = await getClient().rpc("sync_blob_upsert", {
      p_pin: pin,
      p_store: store,
      p_updated_at: updatedAt,
    });
    if (error) {
      if (/invalid pin/i.test(error.message)) throw new SyncPinInvalidError();
      throw new Error(error.message);
    }
  } catch (err) {
    rethrowPinAware(err);
  }
}

// Ongoing sync (readSyncRow/writeSyncRow above, driven by useSupabaseSync's
// timestamp comparison) is a whole-snapshot "newest wins" model - fine once
// every device is already roughly in sync, since day-to-day it only ever
// compares against the state *this same device* last pushed. But the very
// first time each device connects to a fresh/pre-existing cloud row, that
// model is unsafe: earlier cross-device sync (Google Drive) was flaky
// enough that this app's three real devices likely each hold rows the
// others never received, and a plain "newest snapshot wins" pull or push at
// that moment would silently discard whichever side loses the timestamp
// comparison - the exact data loss the household owner explicitly ruled
// out. mergeStores() unions every table by row id instead (local rows win
// on an id collision, but nothing on either side is ever dropped), and
// migrateLocalDataOnce() applies that union exactly once per device - to
// both the cloud row and this device's own local copy - before the regular
// snapshot-based sync loop ever runs. Once every device has migrated, the
// cloud row already reflects the full union, so the ongoing snapshot model
// is safe again.
function mergeStores(remote: Store, local: Store): Store {
  const merged = {} as Store;
  for (const table of Object.keys(local) as (keyof Store)[]) {
    const byId = new Map<unknown, Row>();
    for (const row of remote[table] ?? []) byId.set(row.id, row);
    for (const row of local[table] ?? []) byId.set(row.id, row);
    merged[table] = Array.from(byId.values());
  }
  return merged;
}

const MIGRATION_FLAG_KEY = "keren_amar_supabase_migrated_v1";

function hasMigrated(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MIGRATION_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function markMigrated(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIGRATION_FLAG_KEY, "1");
  } catch {
    // storage full/unavailable - migration will just retry (harmlessly,
    // since it's a union) on the next load.
  }
}

// Returns the merged store when a merge happened (so the caller can also
// apply it to this device's own local copy), or null when there was nothing
// to merge (already migrated, or this was the very first device to connect
// and simply seeded the empty cloud row with its own data as-is).
export async function migrateLocalDataOnce(
  localStore: Store,
  localUpdatedAt: string,
): Promise<{ merged: Store; updatedAt: string } | null> {
  if (hasMigrated()) return null;
  const remote = await readSyncRow();
  if (!remote) {
    await writeSyncRow(localStore, localUpdatedAt);
    markMigrated();
    return null;
  }
  const merged = mergeStores(remote.store as Store, localStore);
  const updatedAt = new Date().toISOString();
  await writeSyncRow(merged, updatedAt);
  markMigrated();
  return { merged, updatedAt };
}
