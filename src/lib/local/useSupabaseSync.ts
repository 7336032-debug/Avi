"use client";

// Wiring for the automatic, login-free Supabase sync (see supabaseSync.ts).
// Every tick compares this device's own last-changed timestamp against the
// shared row's `updated_at` and either pushes, pulls, or does nothing -
// that's what makes it safe to run unattended: an earlier sync design had
// no such signal and, on any difference, always pulled, which could
// silently clobber a not-yet-synced local edit. There is no sign-in screen,
// but there is a one-time-per-device PIN gate (see supabaseSync.ts /
// syncPin.ts) - when the PIN hasn't been entered on this device yet, or was
// wrong, `status.needsPin` goes true and all sync attempts pause until
// `submitPin` succeeds.

import { useCallback, useEffect, useRef, useState } from "react";
import { readStore, applyRemoteStore, getLocalUpdatedAt, STORE_CHANGED_EVENT } from "@/lib/local/browserStore";
import type { Store } from "@/lib/local/store";
import {
  readSyncRow,
  writeSyncRow,
  migrateLocalDataOnce,
  isSupabaseConfigured,
  SyncPinRequiredError,
  SyncPinInvalidError,
} from "@/lib/local/supabaseSync";
import { setSyncPin } from "@/lib/local/syncPin";

const AUTO_SYNC_INTERVAL_MS = 15000;
const AUTO_PUSH_DEBOUNCE_MS = 2000;

export interface SupabaseSyncStatus {
  configured: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  lastAction: "pushed" | "pulled" | "up-to-date" | null;
  needsPin: boolean;
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
    needsPin: false,
  });
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // One-time union-merge of this device's pre-existing local data into the
  // shared cloud row, before the regular snapshot-based sync loop below is
  // allowed to run - see migrateLocalDataOnce()'s comment in supabaseSync.ts
  // for why this has to happen first and can't just be folded into the
  // regular "newest wins" loop. Also the first place a missing/wrong PIN
  // surfaces on a fresh device.
  const [migrated, setMigrated] = useState(false);
  const runMigration = useCallback(async () => {
    try {
      const result = await migrateLocalDataOnce(readStore(), getLocalUpdatedAt());
      if (result) {
        applyRemoteStore(result.merged, result.updatedAt);
        setStatus((s) => ({ ...s, needsPin: false, error: null }));
        reloadSoon();
        return true;
      }
      setStatus((s) => ({ ...s, needsPin: false, error: null }));
      return true;
    } catch (err) {
      if (err instanceof SyncPinRequiredError) {
        setStatus((s) => ({ ...s, needsPin: true, error: null }));
      } else if (err instanceof SyncPinInvalidError) {
        setStatus((s) => ({ ...s, needsPin: true, error: friendlyMessage(err) }));
      }
      // Offline or the migration table isn't reachable yet - safe to
      // retry: migrateLocalDataOnce() only marks itself done after it
      // actually succeeds, so the next attempt tries again.
      return false;
    }
  }, []);

  useEffect(() => {
    if (!configured) return undefined;
    let cancelled = false;
    (async () => {
      await runMigration();
      if (!cancelled) setMigrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, runMigration]);

  const syncOnce = useCallback(async (opts: { reloadOnChange: boolean }) => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const remote = await readSyncRow();
      const localUpdatedAt = getLocalUpdatedAt();

      if (!remote) {
        // Nothing in the cloud yet - this device's data is the seed.
        await writeSyncRow(readStore(), localUpdatedAt);
        setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed", needsPin: false });
        return true;
      }
      if (remote.updated_at > localUpdatedAt) {
        applyRemoteStore(remote.store as Store, remote.updated_at);
        setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pulled", needsPin: false });
        if (opts.reloadOnChange) reloadSoon();
        return true;
      }
      if (localUpdatedAt > remote.updated_at) {
        await writeSyncRow(readStore(), localUpdatedAt);
        setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed", needsPin: false });
        return true;
      }
      // timestamps equal - already in sync, nothing to do.
      setStatus({ configured, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "up-to-date", needsPin: false });
      return true;
    } catch (err) {
      if (err instanceof SyncPinRequiredError) {
        setStatus((s) => ({ ...s, syncing: false, needsPin: true, error: null }));
        return false;
      }
      if (err instanceof SyncPinInvalidError) {
        setStatus((s) => ({ ...s, syncing: false, needsPin: true, error: friendlyMessage(err) }));
        return false;
      }
      setStatus((s) => ({ ...s, syncing: false, error: friendlyMessage(err) }));
      return false;
    }
  }, [configured]);

  const syncNow = useCallback(() => syncOnce({ reloadOnChange: true }), [syncOnce]);

  // Called from the PIN entry form: remembers the PIN on this device, then
  // (re)runs the one-time migration if it hasn't succeeded yet, or a normal
  // sync pass otherwise.
  const submitPin = useCallback(
    async (pin: string) => {
      setSyncPin(pin);
      setStatus((s) => ({ ...s, needsPin: false, error: null, syncing: true }));
      const migrationOk = await runMigration();
      setStatus((s) => ({ ...s, syncing: false }));
      if (!migrationOk) return false;
      return syncOnce({ reloadOnChange: true });
    },
    [runMigration, syncOnce],
  );

  // Automatic background sync: once on mount, on window focus, when the tab
  // becomes visible again, and on a ~15s timer while visible. No sign-in and
  // no popups involved at any point - this just runs, unless the PIN gate
  // (status.needsPin) is currently blocking it.
  useEffect(() => {
    if (!configured || !migrated || status.needsPin) return undefined;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (statusRef.current.syncing || statusRef.current.needsPin) return;
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
  }, [configured, migrated, status.needsPin]);

  // Debounced auto-push shortly after a local edit (logging a treatment,
  // editing/deleting a transaction, etc.), rather than waiting for the next
  // periodic tick.
  useEffect(() => {
    if (!configured || !migrated || status.needsPin) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (statusRef.current.syncing || statusRef.current.needsPin) return;
        syncOnce({ reloadOnChange: false });
      }, AUTO_PUSH_DEBOUNCE_MS);
    };
    window.addEventListener(STORE_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(STORE_CHANGED_EVENT, onChange);
      if (timer) clearTimeout(timer);
    };
  }, [configured, migrated, status.needsPin, syncOnce]);

  return { status, syncNow, submitPin };
}
