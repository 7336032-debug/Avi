"use client";

// Wiring for Google Drive cross-device sync, adapted from tochnit-hachlama's
// DataContext.jsx (search git history for "googleStatus", "signInWithGoogle",
// "googlePushNow"/"googlePullNow", and "Auto-pull Google sync on
// focus/interval") to this app's simpler per-page client-component pattern
// (no global reducer — reads/writes go straight through browserStore.ts).
//
// Sync is automatic (on mount, on window focus, on tab becoming visible,
// and every ~20s while visible), but — unlike an earlier version of this
// file — it's *direction-aware* rather than "always pull on any
// difference". Every write to the Drive file carries the timestamp of
// the local device's data at push time (see browserStore.ts's
// getLocalUpdatedAt()/applyRemoteStore()). Each sync tick compares that
// remote timestamp against this device's own local timestamp and picks
// exactly one of three outcomes:
//   - remote is newer  -> pull (overwrite local with remote)
//   - local is newer   -> push (overwrite remote with local)
//   - equal            -> nothing to do
// That's what makes it safe to run unattended: an earlier version had no
// such signal, so on any difference it always pulled, which meant a
// treatment logged on-device could get silently clobbered by a stale
// cloud snapshot a few seconds later, the moment the timer next fired.
// Manual "sync now" is still exposed for an immediate, explicit sync, and
// `status.lastAction` + `config.fileId` are surfaced in the UI so it's
// possible to tell, without guessing, what a sync actually did and
// whether two devices are even pointed at the same Drive file.

import { useCallback, useEffect, useRef, useState } from "react";
import { readStore, applyRemoteStore, getLocalUpdatedAt } from "@/lib/local/browserStore";
import type { Store } from "@/lib/local/store";
import {
  requestAccessToken,
  getValidAccessToken,
  clearCachedToken,
  findOrCreateSyncFileId,
  readSyncFile,
  writeSyncFile,
  preloadGoogleSyncScript,
  isGoogleConfigured,
} from "@/lib/local/googleSync";
import {
  loadGoogleSyncConfig,
  saveGoogleSyncConfig,
  clearGoogleSyncConfig,
  type GoogleSyncConfig,
} from "@/lib/local/googleSyncConfig";

const AUTO_SYNC_INTERVAL_MS = 20000;

interface SyncPayload {
  updatedAt: string;
  store: Store;
}

export interface GoogleSyncStatus {
  signedIn: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  lastAction: "pushed" | "pulled" | "up-to-date" | null;
}

function friendlyMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "שגיאה לא צפויה בסנכרון עם Google";
}

function reloadSoon() {
  setTimeout(() => window.location.reload(), 800);
}

// Explicit user actions (sign-in, manual "sync now") get a token however
// necessary, popup included. Background ticks stay silent-only and just
// skip this round rather than surprise her with a popup she didn't ask
// for - the next tick (or her next explicit action) tries again.
async function getTokenForExplicitAction(): Promise<string> {
  try {
    return await getValidAccessToken();
  } catch {
    return requestAccessToken();
  }
}

export function useGoogleSync() {
  const [config, setConfig] = useState<GoogleSyncConfig | null>(() => loadGoogleSyncConfig());
  const [status, setStatus] = useState<GoogleSyncStatus>(() => ({
    signedIn: !!loadGoogleSyncConfig(),
    syncing: false,
    lastSyncAt: null,
    error: null,
    lastAction: null,
  }));
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Load the Google sign-in script as soon as this screen mounts, well
  // before any click — see preloadGoogleSyncScript()'s comment for why this
  // matters for the popup not getting blocked on iOS/Safari.
  useEffect(() => {
    if (isGoogleConfigured()) preloadGoogleSyncScript();
  }, []);

  // The one place that actually talks to Drive: fetches the remote
  // payload, compares timestamps against local, and pushes or pulls
  // accordingly. `silent` controls whether a background tick is allowed to
  // pop a sign-in window (never) vs an explicit user action (falls back to
  // one if needed).
  const syncOnce = useCallback(async (fileId: string, opts: { silent: boolean; reloadOnChange: boolean }) => {
    const { silent, reloadOnChange } = opts;
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const token = silent ? await getValidAccessToken() : await getTokenForExplicitAction();
      const remote = await readSyncFile<SyncPayload>(token, fileId);
      const localUpdatedAt = getLocalUpdatedAt();

      if (!remote) {
        // Nothing in the cloud yet - this device's data is the seed.
        await writeSyncFile(token, fileId, { updatedAt: localUpdatedAt, store: readStore() } satisfies SyncPayload);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed" });
        return true;
      }
      if (remote.updatedAt > localUpdatedAt) {
        applyRemoteStore(remote.store, remote.updatedAt);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pulled" });
        if (reloadOnChange) reloadSoon();
        return true;
      }
      if (localUpdatedAt > remote.updatedAt) {
        await writeSyncFile(token, fileId, { updatedAt: localUpdatedAt, store: readStore() } satisfies SyncPayload);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed" });
        return true;
      }
      // timestamps equal - already in sync, nothing to do.
      setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "up-to-date" });
      return true;
    } catch (err) {
      // Background ticks fail quietly (no error banner) - a stale/missing
      // token or a flaky connection every 20s shouldn't nag her with red
      // text; the next tick or her next explicit action just tries again.
      if (silent) {
        setStatus((s) => ({ ...s, syncing: false }));
      } else {
        setStatus((s) => ({ ...s, syncing: false, error: friendlyMessage(err) }));
      }
      return false;
    }
  }, []);

  const syncNow = useCallback(() => {
    if (!config) return;
    return syncOnce(config.fileId, { silent: false, reloadOnChange: true });
  }, [config, syncOnce]);

  const signIn = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const token = await requestAccessToken();
      const fileId = await findOrCreateSyncFileId(token);
      const newConfig: GoogleSyncConfig = { fileId };
      saveGoogleSyncConfig(newConfig);
      setConfig(newConfig);

      const remote = await readSyncFile<SyncPayload>(token, fileId);
      const localUpdatedAt = getLocalUpdatedAt();
      if (remote && remote.updatedAt > localUpdatedAt) {
        applyRemoteStore(remote.store, remote.updatedAt);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pulled" });
        reloadSoon();
      } else {
        // Remote is empty, or this device's data is already newer/equal -
        // either way, this device's data is what should end up in Drive.
        await writeSyncFile(token, fileId, {
          updatedAt: getLocalUpdatedAt(),
          store: readStore(),
        } satisfies SyncPayload);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null, lastAction: "pushed" });
      }
      return true;
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: friendlyMessage(err) }));
      return false;
    }
  }, []);

  const signOut = useCallback(() => {
    clearCachedToken();
    clearGoogleSyncConfig();
    setConfig(null);
    setStatus({ signedIn: false, syncing: false, lastSyncAt: null, error: null, lastAction: null });
  }, []);

  // Automatic background sync: once on mount (if already signed in), on
  // window focus, when the tab becomes visible again, and on a ~20s timer
  // while visible. All of these are silent (no popup) and skip the tick
  // entirely if a sync is already in flight, rather than racing it.
  useEffect(() => {
    if (!config) return undefined;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (statusRef.current.syncing) return;
      syncOnce(config.fileId, { silent: true, reloadOnChange: true });
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
  }, [config]);

  return { config, status, signIn, signOut, syncNow };
}
