"use client";

// Wiring for Google Drive cross-device sync, adapted from tochnit-hachlama's
// DataContext.jsx (search git history for "googleStatus", "signInWithGoogle",
// "googlePushNow"/"googlePullNow", and "Auto-pull Google sync on
// focus/interval") to this app's simpler per-page client-component pattern
// (no global reducer — reads/writes go straight through browserStore.ts).
//
// Behavior ported from the reference:
//  - sign-in resolves (or creates) the single sync file in the user's
//    hidden Drive "appdata" area, then pulls it (or pushes local data if
//    the file was just created / empty).
//  - manual "push now" / "pull now" buttons.
//  - on mount, if this device previously signed in, silently re-pulls once.
//  - while signed in, an auto-pull re-checks on window focus, on the tab
//    becoming visible, and every ~20s while visible — skipped whenever a
//    sync is already in flight (a manual push/pull, or the sign-in flow
//    itself) so it can never clobber an in-progress write.
//  - after a pull that actually changes local data, reloads the page (the
//    same pattern BackupSection.tsx's import and TransactionRow.tsx's
//    edit/delete flows use) so every dependent total/list/calendar cell
//    picks up the new data.

import { useCallback, useEffect, useState } from "react";
import { readStore, writeStore } from "@/lib/local/browserStore";
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

export interface GoogleSyncStatus {
  signedIn: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

function friendlyMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "שגיאה לא צפויה בסנכרון עם Google";
}

function reloadSoon() {
  setTimeout(() => window.location.reload(), 800);
}

export function useGoogleSync() {
  const [config, setConfig] = useState<GoogleSyncConfig | null>(() => loadGoogleSyncConfig());
  const [status, setStatus] = useState<GoogleSyncStatus>(() => ({
    signedIn: !!loadGoogleSyncConfig(),
    syncing: false,
    lastSyncAt: null,
    error: null,
  }));

  // Load the Google sign-in script as soon as this screen mounts, well
  // before any click — see preloadGoogleSyncScript()'s comment for why this
  // matters for the popup not getting blocked on iOS/Safari.
  useEffect(() => {
    if (isGoogleConfigured()) preloadGoogleSyncScript();
  }, []);

  const pullNow = useCallback(
    async (fileId: string, opts: { silent?: boolean; reloadOnChange?: boolean } = {}) => {
      const { silent = false, reloadOnChange = false } = opts;
      setStatus((s) => ({ ...s, syncing: true, error: null }));
      try {
        const token = silent ? await getValidAccessToken() : await requestAccessToken();
        const remote = await readSyncFile<Store>(token, fileId);
        let changed = false;
        if (remote) {
          const current = readStore();
          if (JSON.stringify(remote) !== JSON.stringify(current)) {
            writeStore(remote);
            changed = true;
          }
        }
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null });
        if (changed && reloadOnChange) reloadSoon();
        return true;
      } catch (err) {
        setStatus((s) => ({ ...s, syncing: false, error: friendlyMessage(err) }));
        return false;
      }
    },
    [],
  );

  const pushNow = useCallback(async () => {
    if (!config) return;
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const token = await getValidAccessToken();
      const store = readStore();
      await writeSyncFile(token, config.fileId, store);
      setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null });
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: friendlyMessage(err) }));
    }
  }, [config]);

  const pullManual = useCallback(() => {
    if (!config) return;
    return pullNow(config.fileId, { reloadOnChange: true });
  }, [config, pullNow]);

  const signIn = useCallback(async () => {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const token = await requestAccessToken();
      const fileId = await findOrCreateSyncFileId(token);
      const newConfig: GoogleSyncConfig = { fileId };
      saveGoogleSyncConfig(newConfig);
      setConfig(newConfig);

      const remote = await readSyncFile<Store>(token, fileId);
      if (remote) {
        writeStore(remote);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null });
        reloadSoon();
      } else {
        const store = readStore();
        await writeSyncFile(token, fileId, store);
        setStatus({ signedIn: true, syncing: false, lastSyncAt: new Date().toISOString(), error: null });
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
    setStatus({ signedIn: false, syncing: false, lastSyncAt: null, error: null });
  }, []);

  // Sync is intentionally manual-only (push now / pull now), not automatic.
  // An earlier version silently auto-pulled on a timer/focus and blindly
  // overwrote local data whenever it differed from the Drive file - which
  // is exactly wrong the moment local is the side with the newer,
  // not-yet-pushed change (e.g. she just logged a treatment on this
  // device): it clobbered the fresh entry with the stale remote snapshot
  // a few seconds later. Without a real "which side is newer" signal
  // (e.g. a last-modified timestamp compared before overwriting), silent
  // auto-pull can't safely tell "remote has new changes from another
  // device" apart from "local has new changes I haven't pushed yet" - so
  // this only ever pulls when she explicitly asks it to.

  return { config, status, signIn, signOut, pushNow, pullManual };
}
