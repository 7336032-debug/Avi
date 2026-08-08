// Device-local pairing info (blob id + PIN). Deliberately kept out of the
// main `Store` (see store.ts) — it must never be part of what gets
// encrypted and pushed to the cloud blob, and each device is free to
// remember its own copy.
//
// TypeScript port of tochnit-hachlama's src/lib/syncConfig.js.

const KEY = "keren_amar_sync_config_v1";

export interface SyncConfig {
  id: string;
  pin: string;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSyncConfig(): SyncConfig | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // ignore - sync will just require re-pairing this device
  }
}

export function clearSyncConfig(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
