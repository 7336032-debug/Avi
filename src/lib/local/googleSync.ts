// Automatic cross-device sync via the user's own Google account, using the
// hidden per-app "app data" folder in their Google Drive. This replaces an
// earlier attempt that synced through kvdb.io (a free, anonymous key-value
// HTTP store) — that approach tested unreliable in practice. Google Drive's
// API is well-documented and battle-tested for direct browser access, and
// it's infrastructure the user already trusts with her data.
//
// TypeScript port of tochnit-hachlama's src/lib/googleSync.js, adapted to
// sync this app's `Store` (see ./store.ts) instead of that app's schema.
//
// --- One-time setup required (see SyncSection.tsx for the "not configured"
// UI shown until this is done) ---
// In Google Cloud Console (https://console.cloud.google.com/):
//   1. Create (or reuse) a project, then enable the "Google Drive API".
//   2. Configure the OAuth consent screen (External, testing is fine for a
//      single-user app).
//   3. Create credentials → OAuth client ID → Application type
//      "Web application". Add these as "Authorized JavaScript origins":
//        - https://keren-amar-app.vercel.app
//        - http://localhost:3000  (for local dev)
//   4. Copy the generated Client ID (ends with .apps.googleusercontent.com).
//
// Client IDs are not secrets (unlike client *secrets*, which this flow never
// uses) — they're meant to be public, since every browser-side OAuth request
// already carries the client_id in plain sight. So, like the reference app,
// this is a literal constant rather than something hidden in an env var.
// This one is shared with the "recovery plan" sister app: the same Google
// Cloud OAuth client has both apps' domains listed as authorized origins.
const HARDCODED_CLIENT_ID =
  "43040986513-2nsjh844575p1pdf355qmds1jdk0t72a.apps.googleusercontent.com";

const RAW_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || HARDCODED_CLIENT_ID;

export const GOOGLE_CLIENT_ID = RAW_CLIENT_ID ?? "";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const SYNC_FILE_NAME = "keren-amar-sync-v1.json";

export function isGoogleConfigured(): boolean {
  return (
    typeof GOOGLE_CLIENT_ID === "string" &&
    GOOGLE_CLIENT_ID.length > 0 &&
    GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com")
  );
}

// ---- minimal ambient typing for Google Identity Services (GIS) ----------
interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

interface GisTokenClient {
  callback: (resp: GisTokenResponse) => void;
  error_callback: (err: { message?: string } | undefined) => void;
  requestAccessToken: (opts: { prompt: string }) => void;
}

interface GisAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: GisTokenResponse) => void;
  }) => GisTokenClient;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GisAccountsOauth2;
      };
    };
  }
}

let tokenClient: GisTokenClient | null = null;
let cachedToken: { access_token: string; expiresAt: number } | null = null;

function ensureScriptLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById("gis-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("טעינת שירות Google נכשלה")));
      return;
    }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("טעינת שירות Google נכשלה - בדקי את החיבור לאינטרנט"));
    document.head.appendChild(script);
  });
}

async function getTokenClient(): Promise<GisTokenClient> {
  await ensureScriptLoaded();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("שירות ההתחברות של Google לא נטען כראוי - נסי שוב");
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: () => {}, // overridden per-request below
    });
  }
  return tokenClient;
}

// Requests a fresh access token via an interactive Google popup (or silent
// refresh if the browser still has an active Google session).
export async function requestAccessToken({ silent = false }: { silent?: boolean } = {}): Promise<string> {
  if (!isGoogleConfigured()) {
    throw new Error("סנכרון Google עדיין לא הוגדר במערכת");
  }
  const client = await getTokenClient();
  return new Promise((resolve, reject) => {
    client.callback = (resp) => {
      if (resp.error) {
        reject(
          new Error(
            resp.error === "access_denied" || resp.error === "popup_closed_by_user"
              ? "ההתחברות בוטלה"
              : `שגיאת התחברות ל-Google: ${resp.error}`,
          ),
        );
        return;
      }
      cachedToken = { access_token: resp.access_token, expiresAt: Date.now() + (resp.expires_in - 60) * 1000 };
      resolve(cachedToken.access_token);
    };
    client.error_callback = (err) => {
      const msg = err?.message ?? "";
      if (/popup/i.test(msg)) {
        reject(new Error("החלון הקופץ של Google נחסם - יש לאפשר חלונות קופצים ולנסות שוב"));
        return;
      }
      reject(new Error(msg || "ההתחברות ל-Google נכשלה"));
    };
    try {
      client.requestAccessToken({ prompt: silent ? "" : "consent" });
    } catch {
      reject(new Error("ההתחברות ל-Google נכשלה - נסי שוב"));
    }
  });
}

export async function getValidAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.access_token;
  return requestAccessToken({ silent: true });
}

export function clearCachedToken(): void {
  cachedToken = null;
}

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

async function driveFetch(url: string, options: RequestInit, accessToken: string): Promise<Response> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("אין חיבור לאינטרנט - הנתונים יסתנכרנו כשהחיבור יחזור");
  }
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error("אין חיבור לאינטרנט - בדקי את הרשת ונסי שוב");
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error("ההתחברות ל-Google פגה - יש להתחבר שוב");
    if (res.status === 403) throw new Error("Google Drive חסם את הבקשה - נסי להתחבר מחדש");
    throw new Error(`שגיאת Google Drive (${res.status})`);
  }
  return res;
}

export async function findOrCreateSyncFileId(accessToken: string): Promise<string> {
  const query = new URLSearchParams({
    spaces: "appDataFolder",
    q: `name = '${SYNC_FILE_NAME}'`,
    fields: "files(id,name)",
  });
  const listRes = await driveFetch(`${DRIVE_FILES_URL}?${query}`, { method: "GET" }, accessToken);
  const listData = (await listRes.json()) as { files?: Array<{ id: string; name: string }> };
  if (listData.files && listData.files.length > 0) return listData.files[0].id;

  const createRes = await driveFetch(
    DRIVE_FILES_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: SYNC_FILE_NAME, parents: ["appDataFolder"] }),
    },
    accessToken,
  );
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

export async function readSyncFile<T = unknown>(accessToken: string, fileId: string): Promise<T | null> {
  const res = await driveFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, { method: "GET" }, accessToken);
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("קובץ הסנכרון ב-Google Drive פגום");
  }
}

export async function writeSyncFile(accessToken: string, fileId: string, content: unknown): Promise<void> {
  await driveFetch(
    `${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) },
    accessToken,
  );
}
