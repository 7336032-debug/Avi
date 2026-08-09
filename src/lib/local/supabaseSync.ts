// Automatic cross-device sync via Supabase, storing the whole local `Store`
// (see ./store.ts) as one JSON snapshot row, synced with timestamp-based
// push/pull direction (see useSupabaseSync.ts). See
// supabase/migrations/0005_sync_blob.sql for the table/policies this talks
// to.
//
// There is NO sign-in step at all: the anon/publishable key is safe to ship
// in client code (Postgres Row Level Security is what actually restricts it
// - see the migration), so every device can read/write the shared sync row
// the moment the page loads, with no popup, no account, no user action
// required.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LOCAL_USER_ID } from "./store";

// Not secrets: the anon/publishable key is meant to be public in client-side
// code (like the Google OAuth Client ID was) - real access control is the
// RLS policy in the migration, which only allows touching the one row whose
// id equals LOCAL_USER_ID.
const SUPABASE_URL = "https://bwfsbmkyiiqlrhbuyhpy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ljf2NgSqjMPcScyibIvv0Q_coW_TyRC";

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

export async function readSyncRow(): Promise<SyncBlobRow | null> {
  try {
    const { data, error } = await getClient()
      .from("sync_blob")
      .select("id, store, updated_at")
      .eq("id", SYNC_ROW_ID)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as SyncBlobRow | null) ?? null;
  } catch (err) {
    if (err instanceof Error && err.message) throw err;
    throw friendlyFetchError();
  }
}

export async function writeSyncRow(store: unknown, updatedAt: string): Promise<void> {
  try {
    const { error } = await getClient()
      .from("sync_blob")
      .upsert({ id: SYNC_ROW_ID, store, updated_at: updatedAt }, { onConflict: "id" });
    if (error) throw new Error(error.message);
  } catch (err) {
    if (err instanceof Error && err.message) throw err;
    throw friendlyFetchError();
  }
}
