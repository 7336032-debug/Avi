"use client";

// Wiring for the automatic, login-free Supabase sync (see supabaseSync.ts).
// Every tick compares this device's own last-changed timestamp against the
// shared row's `updated_at` and either pushes, pulls, or does nothing -
// that's what makes it safe to run unattended: an earlier sync design had
// no such signal and, on any difference, always pulled, which could
// silently clobber a not-yet-synced local edit. There is no sign-in step at
// all - this just starts syncing the moment the page loads, on every
// device, automatically.

import { useCallback, useEffect, useRef, useState } from "react";
import { readStore, applyRemoteStore, getLocalUpdatedAt, STORE_CHANGED_EVENT } from "@/lib/local/browserStore";
import type { Store } from "@/lib/local/store";
import { readSyncRow, writeSyncRow, isSupabaseConfigured } from "@/lib/local/supabaseSync";

const AUTO_SYNC_INTERVAL_MS = 15000;
const AUTO_PUSH_DEBOUNCE_MS = 2000;

export interface SupabaseSyncStatus {
  configured: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  lastAction: "pushed" | "pulled" | "up-to-date" | null;
}

function friendlyMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "שגיאה לא צפויה בסנכרון";
}

function reloadSoon() {
  setTimeout(() => window.location.reload(), 800);
}

export function useSupabaseSync() {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<SupabaseSyncStatus>({
    configured,
    syncing: false,
    lastSyncAt: null,
    error: null,
    lastAction: null,
  });
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const syncOnce = useCallback(async (opts: { reloadOnChange: boolean }) => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const remote = await readSyncRow();
      const localUpdatedAt = getLocalUpdatedAt();

      if (!remote) {
        // Nothing in the cloud yet - this device's data is the seed.
        await writeSyncRow(readStore(), localUpdatedAt);
        setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed" });
        return true;
      }
      if (remote.updated_at > localUpdatedAt) {
        applyRemoteStore(remote.store as Store, remote.updated_at);
        setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pulled" });
        if (opts.reloadOnChange) reloadSoon();
        return true;
      }
      if (localUpdatedAt > remote.updated_at) {
        await writeSyncRow(readStore(), localUpdatedAt);
        setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed" });
        return true;
      }
      // timestamps equal - already in sync, nothing to do.
      setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "up-to-date" });
      return true;
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: friendlyMessage(err) }));
      return false;
    }
  }, [configured]);

  const syncNow = useCallback(() => syncOnce({ reloadOnChange: true }), [syncOnce]);

  // Automatic background sync: once on mount, on window focus, when the tab
  // becomes visible again, and on a ~15s timer while visible. No sign-in and
  // no popups involved at any point - this just runs.
  useEffect(() => {
    if (!configured) return undefined;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (statusRef.current.syncing) return;
      syncOnce({ reloadOnChange: true });
    };
    tick();
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    const interval = setInterval(tick, AUTO_SYNC_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  // Debounced auto-push shortly after a local edit (logging a treatment,
  // editing/deleting a transaction, etc.), rather than waiting for the next
  // periodic tick.
  useEffect(() => {
    if (!configured) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (statusRef.current.syncing) return;
        syncOnce({ reloadOnChange: false });
      }, AUTO_PUSH_DEBOUNCE_MS);
    };
    window.addEventListener(STORE_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(STORE_CHANGED_EVENT, onChange);
      if (timer) clearTimeout(timer);
    };
  }, [configured, syncOnce]);

  return { status, syncNow };
}
