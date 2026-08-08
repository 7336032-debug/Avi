// Device-local cache: the Drive file id (not secret, just saves a lookup)
// remembered so we know this device previously signed in and can attempt a
// silent (popup-free) token refresh on the next app load.
//
// TypeScript port of tochnit-hachlama's src/lib/googleSyncConfig.js.

const KEY = "keren_amar_google_sync_v1";

export interface GoogleSyncConfig {
  fileId: string;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadGoogleSyncConfig(): GoogleSyncConfig | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GoogleSyncConfig) : null;
  } catch {
    return null;
  }
}

export function saveGoogleSyncConfig(config: GoogleSyncConfig): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // ignore - sync will just re-resolve the file id next time
  }
}

export function clearGoogleSyncConfig(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
