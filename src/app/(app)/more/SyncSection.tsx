"use client";

// Cross-device sync via a pairing code — zero-account, modeled on
// tochnit-hachlama's SyncSection.jsx/DataContext.jsx (see cloudSync.ts and
// syncConfig.ts for the underlying mechanism). The whole local `Store` is
// encrypted with a PIN and pushed to kvdb.io; only ciphertext ever leaves
// the device. Manual "push now" / "pull now" only (no auto-push) — kept
// simple and predictable, matching the reference app's on-demand model.

import { useState } from "react";
import { Cloud, CloudOff, Copy, Check, Link2, Plus } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { readStore, writeStore } from "@/lib/local/browserStore";
import {
  encryptPayload,
  decryptPayload,
  generatePin,
  createCloudBlob,
  pushCloudBlob,
  pullCloudBlob,
  type EncryptedBlob,
} from "@/lib/local/cloudSync";
import {
  loadSyncConfig,
  saveSyncConfig,
  clearSyncConfig,
  type SyncConfig,
} from "@/lib/local/syncConfig";
import type { Store } from "@/lib/local/store";

interface SyncStatus {
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

const initialStatus: SyncStatus = { syncing: false, lastSyncAt: null, error: null };

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function reloadSoon() {
  setTimeout(() => window.location.reload(), 800);
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="flex items-center justify-between gap-2.5 rounded-xl bg-surface-soft px-3.5 py-2.5">
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className="text-lg font-extrabold tracking-wide">{value}</div>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "הועתק" : "העתקה"}
      </Button>
    </div>
  );
}

function JustCreatedPanel({ config, onDone }: { config: SyncConfig; onDone: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        הסנכרון הופעל! העתיקי את שני הפרטים האלה, ובמכשיר השני: עוד ⚙️ ← סנכרון
        בין מכשירים ← &quot;יש לי כבר קוד ממכשיר אחר&quot; ← הדביקי כאן.
      </p>
      <CopyRow label="קוד סנכרון" value={config.id} />
      <CopyRow label="פין" value={config.pin} />
      <Button type="button" size="sm" className="w-full" onClick={onDone}>
        סיימתי, חזרה
      </Button>
    </div>
  );
}

function SetupPanel({
  status,
  onStart,
}: {
  status: SyncStatus;
  onStart: () => void;
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={onStart}
        disabled={status.syncing}
      >
        <Cloud size={16} />
        {status.syncing ? "יוצרת סנכרון..." : "הפעלת סנכרון (המכשיר הראשון)"}
      </Button>
      {status.error ? <ErrorBanner message={status.error} /> : null}
    </div>
  );
}

function ConnectPanel({
  status,
  onConnect,
}: {
  status: SyncStatus;
  onConnect: (code: string, pin: string) => void;
}) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onConnect(code.trim(), pin.trim());
      }}
    >
      <div>
        <Label htmlFor="sync-code">קוד סנכרון</Label>
        <Input
          id="sync-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="הקוד מהמכשיר הראשון"
        />
      </div>
      <div>
        <Label htmlFor="sync-pin">פין (6 ספרות)</Label>
        <Input
          id="sync-pin"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          inputMode="numeric"
          placeholder="000000"
        />
      </div>
      <Button type="submit" size="sm" className="w-full" disabled={status.syncing || !code || !pin}>
        <Link2 size={16} />
        {status.syncing ? "מתחברת..." : "התחברות"}
      </Button>
      {status.error ? <ErrorBanner message={status.error} /> : null}
    </form>
  );
}

function ConnectedPanel({
  config,
  status,
  onPush,
  onPull,
  onDisconnect,
}: {
  config: SyncConfig;
  status: SyncStatus;
  onPush: () => void;
  onPull: () => void;
  onDisconnect: () => void;
}) {
  const [showCode, setShowCode] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-sm font-semibold text-success">
          <Cloud size={14} aria-hidden /> הסנכרון פעיל
        </span>
        <span className="text-xs text-text-muted">
          {status.syncing
            ? "מסנכרנת..."
            : status.lastSyncAt
              ? `סונכרן לאחרונה ב-${formatTime(status.lastSyncAt)}`
              : "טרם בוצע סנכרון"}
        </span>
      </div>

      {status.error ? <ErrorBanner message={status.error} /> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onPush} disabled={status.syncing}>
          שמירה עכשיו
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onPull} disabled={status.syncing}>
          טעינה עכשיו
        </Button>
      </div>

      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setShowCode((v) => !v)}>
        <Plus size={16} />
        {showCode ? "הסתרת הקוד" : "צימוד מכשיר נוסף"}
      </Button>
      {showCode ? (
        <div className="space-y-2">
          <CopyRow label="קוד סנכרון" value={config.id} />
          <CopyRow label="פין" value={config.pin} />
        </div>
      ) : null}

      {!confirmingDisconnect ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setConfirmingDisconnect(true)}
        >
          <CloudOff size={16} />
          ניתוק סנכרון במכשיר הזה
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl bg-warning-bg p-3">
          <p className="text-sm text-warning">לנתק רק את המכשיר הזה? הנתונים בענן לא יימחקו.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="danger" size="sm" onClick={onDisconnect}>
              כן, נתקי
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmingDisconnect(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SyncSection() {
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(() => loadSyncConfig());
  const [status, setStatus] = useState<SyncStatus>(initialStatus);
  const [mode, setMode] = useState<"choice" | "setup" | "connect">("choice");
  const [justCreated, setJustCreated] = useState<SyncConfig | null>(null);

  async function handleStart() {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const pin = generatePin();
      const store = readStore();
      const payload = await encryptPayload(store, pin);
      const id = await createCloudBlob(payload);
      const config: SyncConfig = { id, pin };
      saveSyncConfig(config);
      setSyncConfig(config);
      setStatus({ syncing: false, lastSyncAt: new Date().toISOString(), error: null });
      setJustCreated(config);
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: (err as Error).message }));
    }
  }

  async function handleConnect(id: string, pin: string) {
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const blob = await pullCloudBlob(id);
      const cloudStore = await decryptPayload<Store>(blob, pin);
      const config: SyncConfig = { id, pin };
      saveSyncConfig(config);
      setSyncConfig(config);
      writeStore(cloudStore);
      setStatus({ syncing: false, lastSyncAt: new Date().toISOString(), error: null });
      reloadSoon();
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: (err as Error).message }));
    }
  }

  async function handlePush() {
    if (!syncConfig) return;
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const store = readStore();
      const payload: EncryptedBlob = await encryptPayload(store, syncConfig.pin);
      await pushCloudBlob(syncConfig.id, payload);
      setStatus({ syncing: false, lastSyncAt: new Date().toISOString(), error: null });
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: (err as Error).message }));
    }
  }

  async function handlePull() {
    if (!syncConfig) return;
    setStatus((s) => ({ ...s, syncing: true, error: null }));
    try {
      const blob = await pullCloudBlob(syncConfig.id);
      const cloudStore = await decryptPayload<Store>(blob, syncConfig.pin);
      writeStore(cloudStore);
      setStatus({ syncing: false, lastSyncAt: new Date().toISOString(), error: null });
      reloadSoon();
    } catch (err) {
      setStatus((s) => ({ ...s, syncing: false, error: (err as Error).message }));
    }
  }

  function handleDisconnect() {
    clearSyncConfig();
    setSyncConfig(null);
    setStatus(initialStatus);
    setMode("choice");
  }

  return (
    <Card>
      <CardTitle>☁️ סנכרון בין מכשירים</CardTitle>

      {justCreated ? (
        <JustCreatedPanel config={justCreated} onDone={() => setJustCreated(null)} />
      ) : syncConfig ? (
        <ConnectedPanel
          config={syncConfig}
          status={status}
          onPush={handlePush}
          onPull={handlePull}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            סנכרון שומר את הנתונים שלך מוצפנים בענן כדי שיהיו זמינים גם בטלפון
            וגם במחשב - בלי צורך בהרשמה או חשבון.
          </p>
          {mode === "choice" ? (
            <div className="space-y-2">
              <Button type="button" size="sm" className="w-full" onClick={() => setMode("setup")}>
                <Cloud size={16} />
                הפעלת סנכרון (מכשיר ראשון)
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setMode("connect")}
              >
                <Link2 size={16} />
                יש לי כבר קוד ממכשיר אחר
              </Button>
            </div>
          ) : null}
          {mode === "setup" ? <SetupPanel status={status} onStart={handleStart} /> : null}
          {mode === "connect" ? <ConnectPanel status={status} onConnect={handleConnect} /> : null}
        </div>
      )}
    </Card>
  );
}
