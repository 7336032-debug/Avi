"use client";

// Automatic, login-free cross-device sync via Supabase (see
// ../../../lib/local/supabaseSync.ts and useSupabaseSync.ts). No sign-in
// screen and nothing to configure per device - it just runs in the
// background on every device the moment this screen (or really, any screen
// that mounts useSupabaseSync - see layout wiring) loads.

import { useState } from "react";
import { Cloud, Lock } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useSupabaseSync, type SupabaseSyncStatus } from "@/lib/local/useSupabaseSync";

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function NotConfiguredPanel() {
  return (
    <p className="rounded-xl bg-surface-soft px-3.5 py-2.5 text-sm text-text-muted">
      🔧 סנכרון בין מכשירים עדיין לא הוגדר במערכת. עד אז אפשר להשתמש
      בייצוא/יבוא הידני למטה.
    </p>
  );
}

const LAST_ACTION_LABEL: Record<NonNullable<SupabaseSyncStatus["lastAction"]>, string> = {
  pushed: "הנתונים של המכשיר הזה הועלו לענן",
  pulled: "התקבלו נתונים חדשים ממכשיר אחר",
  "up-to-date": "כבר מסונכרן, אין שינוי",
};

function ConfiguredPanel({ status, onSyncNow }: { status: SupabaseSyncStatus; onSyncNow: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-sm font-semibold text-success">
          <Cloud size={14} aria-hidden /> מסונכרן אוטומטית
        </span>
        <span className="text-xs text-text-muted">
          {status.syncing
            ? "מסנכרנת..."
            : status.lastSyncAt
              ? `סונכרן לאחרונה ב-${formatTime(status.lastSyncAt)}`
              : "טרם בוצע סנכרון"}
        </span>
      </div>

      {!status.syncing && status.lastAction ? (
        <p className="text-xs text-text-muted">↳ {LAST_ACTION_LABEL[status.lastAction]}</p>
      ) : null}

      <p className="text-xs text-text-muted">
        הנתונים מסתנכרנים אוטומטית ברקע בין כל המכשירים - בלי צורך להתחבר או
        להגדיר משהו. אפשר גם לסנכרן עכשיו במפורש:
      </p>

      {status.error ? <ErrorBanner message={status.error} /> : null}

      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onSyncNow} disabled={status.syncing}>
        סנכרון עכשיו
      </Button>
    </div>
  );
}

function PinPanel({ status, onSubmit }: { status: SupabaseSyncStatus; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = pin.trim();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <p className="flex items-center gap-1.5 text-sm text-text-muted">
        <Lock size={14} aria-hidden /> כדי לסנכרן בין המכשירים יש להזין את קוד
        הסנכרון (מוגדר פעם אחת בכל מכשיר, ונשמר רק בו).
      </p>
      {status.error ? <ErrorBanner message={status.error} /> : null}
      <Input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="קוד הסנכרון"
      />
      <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={!pin.trim() || status.syncing}>
        {status.syncing ? "בודקת..." : "אישור"}
      </Button>
    </form>
  );
}

export function SyncSection() {
  const { status, syncNow, submitPin } = useSupabaseSync();

  return (
    <Card>
      <CardTitle>☁️ סנכרון בין מכשירים</CardTitle>

      {!status.configured ? (
        <NotConfiguredPanel />
      ) : status.needsPin ? (
        <PinPanel status={status} onSubmit={submitPin} />
      ) : (
        <ConfiguredPanel status={status} onSyncNow={() => syncNow()} />
      )}
    </Card>
  );
}
