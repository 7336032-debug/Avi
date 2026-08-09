// Persistent, browser-only data store: everything lives in this device's
// localStorage as the source of truth, so the app works fully offline. No
// login, no account — there is exactly one implicit user per device (see
// LOCAL_USER_ID). Cross-device sync layers on top of this via
// readStore()/writeStore() — see supabaseSync.ts + useSupabaseSync.ts for
// the automatic, login-free Supabase sync mechanism, and export/import
// below remains available as a manual, no-network fallback.

import { LOCAL_USER_ID, type Row, type Store } from "./store";

const STORAGE_KEY = "keren_amar_store_v1";

function nowIso() {
  return new Date().toISOString();
}

function seedTreatments(): Row[] {
  const now = nowIso();
  return [
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "ציפורניים", name: "מריחת לק", description: null, price: 150, price_note: null, duration_minutes: 45, is_series: false, series_size: null, series_price: null, sort_order: 1, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "ציפורניים", name: "בניית ציפורניים באקריל + לק", description: null, price: 300, price_note: null, duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 2, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "ניקוי עמוק", description: "אבחון עור, פילינג, ניקוז, לחויות במכשור מתקדם, מסכות, פוטותרפיה", price: 400, price_note: null, duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 10, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "פוטותרפיה", description: "חיטוי, טיהור, אנטי-אייג'ינג, קולגן ואלסטין, הבהרה", price: 150, price_note: null, duration_minutes: 20, is_series: false, series_size: null, series_price: null, sort_order: 11, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "טיפול הבהרה", description: "פילינג + מכשור מתקדם", price: 400, price_note: null, duration_minutes: 60, is_series: true, series_size: 4, series_price: 1400, sort_order: 12, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "מזותרפיה", description: "פציעה מבוקרת, מעודד התחדשות עור - בסדרה בלבד", price: 500, price_note: null, duration_minutes: 50, is_series: true, series_size: 5, series_price: 2000, sort_order: 13, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "אלקטרופורציה", description: "החדרת חומרים פעילים, השלמה לזוהר", price: null, price_note: "400-600 ₪", duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 14, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF חיצוני", description: "קולגן, אלסטין, מיצוק", price: 600, price_note: null, duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 15, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF פנים", description: null, price: null, price_note: "700-900 ₪", duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 16, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF גוף", description: null, price: null, price_note: "800-1500 ₪", duration_minutes: 75, is_series: false, series_size: null, series_price: null, sort_order: 17, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF צוואר", description: null, price: 800, price_note: null, duration_minutes: 50, is_series: false, series_size: null, series_price: null, sort_order: 18, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF צוואר ופנים", description: null, price: 1000, price_note: null, duration_minutes: 75, is_series: false, series_size: null, series_price: null, sort_order: 19, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "הסרת סרחי עור", description: null, price: null, price_note: "לפי הערכה בייעוץ", duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 20, created_at: now },
  ];
}

function seedExpenseCategories(): Row[] {
  const now = nowIso();
  return [
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, name: "חומרי גלם", default_amount: null, sort_order: 1, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, name: "ציוד", default_amount: null, sort_order: 2, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, name: "שכירות", default_amount: null, sort_order: 3, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, name: "שיווק", default_amount: null, sort_order: 4, created_at: now },
    { id: crypto.randomUUID(), user_id: LOCAL_USER_ID, name: "אחר", default_amount: null, sort_order: 5, created_at: now },
  ];
}

function freshStore(): Store {
  return {
    treatments: seedTreatments(),
    treatment_log: [],
    product_sales: [],
    expense_categories: seedExpenseCategories(),
    expenses: [],
    weekly_goals: [],
  };
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// Tracks when this device's data last actually changed, kept separate from
// `Store` itself (rather than a field inside it) so `Store` stays exactly
// "the data tables" — queryBuilder.ts derives its table-name type from
// `keyof Store`, and a metadata field there would incorrectly look like a
// table. Cross-device sync (see supabaseSync.ts/useSupabaseSync.ts) uses
// this to tell "remote has newer changes" apart from "local has newer
// changes not yet pushed" - without such a signal, any difference would
// have to always overwrite local with the remote snapshot, which would
// silently destroy not-yet-pushed local edits.
const META_KEY = "keren_amar_store_meta_v1";
const EPOCH = new Date(0).toISOString();

export function getLocalUpdatedAt(): string {
  if (!isBrowser()) return EPOCH;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return EPOCH;
    const parsed = JSON.parse(raw) as { updatedAt?: string };
    return parsed.updatedAt ?? EPOCH;
  } catch {
    return EPOCH;
  }
}

function setLocalUpdatedAt(iso: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: iso }));
  } catch {
    // storage full/unavailable — sync will just treat this device as
    // "always stale" until storage works again, which just means it keeps
    // pulling rather than ever thinking it has unpushed changes; safe.
  }
}

let memoryFallback: Store | null = null;

export function readStore(): Store {
  if (!isBrowser()) {
    // SSR/build-time guard: never persisted, just keeps callers from crashing.
    if (!memoryFallback) memoryFallback = freshStore();
    return memoryFallback;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = freshStore();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return freshStore();
  }
}

// Fired after a genuine local write (not after applyRemoteStore(), which is
// data arriving FROM a pull - pushing that right back would be pointless).
// useSupabaseSync.ts listens for this to debounce-push shortly after an
// edit, instead of waiting for the next periodic sync tick.
export const STORE_CHANGED_EVENT = "ka:store-changed";

export function writeStore(store: Store): void {
  if (!isBrowser()) {
    memoryFallback = store;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setLocalUpdatedAt(new Date().toISOString());
    window.dispatchEvent(new Event(STORE_CHANGED_EVENT));
  } catch {
    // storage full/unavailable — mutation stays in memory for this session only
  }
}

// Used only by the cross-device sync pull path to apply a snapshot that
// came FROM another device, as opposed to a genuine local edit - so this
// stamps the *remote's own* timestamp as this device's "last known state"
// time instead of "now", which would otherwise make this device look like
// it has newer unpushed changes than it actually does right after a pull.
export function applyRemoteStore(store: Store, remoteUpdatedAt: string): void {
  if (!isBrowser()) {
    memoryFallback = store;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    setLocalUpdatedAt(remoteUpdatedAt);
  } catch {
    // storage full/unavailable — mutation stays in memory for this session only
  }
}

export function exportStoreJson(): string {
  return JSON.stringify(readStore());
}

export function importStoreJson(json: string): void {
  const parsed = JSON.parse(json) as Store;
  writeStore(parsed);
}
