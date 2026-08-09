// This device's own copy of the sync PIN (see supabase/migrations/0006_sync_pin.sql)
// - entered once per device, kept only in this device's localStorage, and
// never part of the committed source or the public JS bundle.

const PIN_KEY = "keren_amar_sync_pin_v1";

export function getSyncPin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function setSyncPin(pin: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIN_KEY, pin);
  } catch {
    // storage full/unavailable - the PIN just won't be remembered, and
    // sync will ask for it again next time.
  }
}

export function clearSyncPin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PIN_KEY);
  } catch {
    // ignore
  }
}
