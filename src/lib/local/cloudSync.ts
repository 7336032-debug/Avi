// Zero-account cross-device sync: the app's entire local `Store` is
// encrypted client-side with a PIN and stored under a randomly-generated
// key in kvdb.io (a free, anonymous, keyless key-value HTTP store — no
// sign-up, no API key). Neither the PIN nor the unencrypted data ever
// leaves the device — only ciphertext is sent over the network. The key
// is entirely client-generated (never read from a server response),
// because reading response headers like `Location` cross-origin isn't
// reliably exposed by arbitrary third-party APIs under CORS — this
// sidesteps that failure mode.
//
// TypeScript port of tochnit-hachlama's src/lib/cloudSync.js, adapted to
// sync this app's `Store` (see ./store.ts) instead of that app's schema.

const API_BASE = "https://kvdb.io";
const PBKDF2_ITERATIONS = 150000;
// Namespaces this app's keys within kvdb.io's shared global keyspace so a
// pairing code can never collide with (or be guessed to be) one from the
// sister "tochnit-hachlama" app or anyone else.
const KEY_PREFIX = "keren_amar_";

export interface EncryptedBlob {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(pin: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPayload(obj: unknown, pin: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(obj)),
  );
  return { v: 1, salt: toBase64(salt.buffer as ArrayBuffer), iv: toBase64(iv.buffer as ArrayBuffer), data: toBase64(ciphertext) };
}

export async function decryptPayload<T = unknown>(blob: EncryptedBlob | null | undefined, pin: string): Promise<T> {
  if (!blob || !blob.salt || !blob.iv || !blob.data) {
    throw new Error("הקוד או הפין לא נכונים");
  }
  try {
    const salt = fromBase64(blob.salt);
    const iv = fromBase64(blob.iv);
    const key = await deriveKey(pin, salt);
    const data = fromBase64(blob.data);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      data as BufferSource,
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    throw new Error("הקוד או הפין לא נכונים");
  }
}

export function generatePin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

function generateSyncId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function blobUrl(id: string): string {
  return `${API_BASE}/${KEY_PREFIX}${id}/state`;
}

export async function pushCloudBlob(id: string, payload: EncryptedBlob): Promise<void> {
  let res: Response;
  try {
    res = await fetch(blobUrl(id), {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("אין חיבור לאינטרנט - השמירה לענן תנוסה שוב בפעם הבאה");
  }
  if (!res.ok) throw new Error("שמירה לענן נכשלה");
}

export async function pullCloudBlob(id: string): Promise<EncryptedBlob> {
  let res: Response;
  try {
    res = await fetch(blobUrl(id));
  } catch {
    throw new Error("אין חיבור לאינטרנט - נסי שוב");
  }
  if (res.status === 404) throw new Error("קוד הסנכרון לא נמצא - בדקי שהעתקת אותו נכון");
  if (!res.ok) throw new Error("טעינה מהענן נכשלה - בדקי את קוד הסנכרון");
  const text = await res.text();
  try {
    return JSON.parse(text) as EncryptedBlob;
  } catch {
    throw new Error("הנתונים בענן פגומים - נסי להפעיל סנכרון חדש");
  }
}

// Creates a brand-new sync pairing: picks a fresh id, writes the first
// snapshot, then immediately reads it back to confirm the round-trip
// actually works before showing the pairing code to the user.
export async function createCloudBlob(payload: EncryptedBlob): Promise<string> {
  const id = generateSyncId();
  await pushCloudBlob(id, payload);
  const verify = await pullCloudBlob(id);
  if (!verify || verify.data !== payload.data) {
    throw new Error("אימות הסנכרון נכשל, נסי שוב");
  }
  return id;
}
