"use client";

// Automatic cross-device sync via the user's own Google account (Drive's
// hidden per-app "appdata" folder) — modeled on tochnit-hachlama's
// GoogleSyncPanel.jsx/DataContext.jsx. Replaces an earlier kvdb.io-based
// pairing-code approach that tested unreliable in practice. See
// googleSync.ts, googleSyncConfig.ts and useGoogleSync.ts for the
// underlying mechanism (in particular: sync direction is timestamp-based,
// not "always pull on any difference", so it's safe to run automatically).
//
// Three states:
//  - not configured (no NEXT_PUBLIC_GOOGLE_CLIENT_ID set yet) - a small
//    notice; the rest of the app (including manual export/import below)
//    stays fully usable.
//  - signed out - a "sign in with Google" button + a note that the SAME
//    Google account must be used on every device.
//  - signed in - status/last-synced time, a "sync now" button for an
//    immediate sync, and a disconnect option with a confirm step.

import { useState } from "react";
import { Cloud, CloudOff } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { isGoogleConfigured } from "@/lib/local/googleSync";
import { useGoogleSync, type GoogleSyncStatus } from "@/lib/local/useGoogleSync";

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function NotConfiguredPanel() {
  return (
    <p className="rounded-xl bg-surface-soft px-3.5 py-2.5 text-sm text-text-muted">
      🔧 סנכרון עם Google עדיין לא הוגדר במערכת. עד אז אפשר להשתמש
      בייצוא/יבוא הידני למטה.
    </p>
  );
}

function SignedOutPanel({ status, onSignIn }: { status: GoogleSyncStatus; onSignIn: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        התחברות עם חשבון Google מסנכרנת את הנתונים <b className="text-text">אוטומטית</b> בין כל
        המכשירים - בלי לחזור על שום פעולה. יש להתחבר עם{" "}
        <b className="text-text">אותו חשבון Google</b> בכל מכשיר.
      </p>
      <Button type="button" size="sm" className="w-full" onClick={onSignIn} disabled={status.syncing}>
        <Cloud size={16} />
        {status.syncing ? "מתחברת..." : "התחברות עם Google"}
      </Button>
      {status.error ? <ErrorBanner message={status.error} /> : null}
    </div>
  );
}

const LAST_ACTION_LABEL: Record<NonNullable<GoogleSyncStatus["lastAction"]>, string> = {
  pushed: "הנתונים של המכשיר הזה הועלו לענן",
  pulled: "התקבלו נתונים חדשים מהענן",
  "up-to-date": "כבר מסונכרן, אין שינוי",
};

function SignedInPanel({
  status,
  fileId,
  onSyncNow,
  onSignOut,
}: {
  status: GoogleSyncStatus;
  fileId: string;
  onSyncNow: () => void;
  onSignOut: () => void;
}) {
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-sm font-semibold text-success">
          <Cloud size={14} aria-hidden /> מחוברת ל-Google
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
        מסתנכרן אוטומטית ברקע. אפשר גם לסנכרן עכשיו במפורש:
      </p>

      {status.error ? <ErrorBanner message={status.error} /> : null}

      <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onSyncNow} disabled={status.syncing}>
        סנכרון עכשיו
      </Button>

      {!confirmingSignOut ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setConfirmingSignOut(true)}
        >
          <CloudOff size={16} />
          התנתקות מ-Google במכשיר הזה
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl bg-warning-bg p-3">
          <p className="text-sm text-warning">להתנתק? הנתונים ב-Google Drive לא יימחקו.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="danger" size="sm" onClick={onSignOut}>
              כן, התנתקי
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmingSignOut(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-text-muted/70">
        מזהה קובץ סנכרון: {fileId.slice(0, 8)}… (צריך להיות זהה בכל המכשירים)
      </p>
    </div>
  );
}

export function SyncSection() {
  const { config, status, signIn, signOut, syncNow } = useGoogleSync();

  return (
    <Card>
      <CardTitle>☁️ סנכרון בין מכשירים</CardTitle>

      {!isGoogleConfigured() ? (
        <NotConfiguredPanel />
      ) : !config || !status.signedIn ? (
        <SignedOutPanel status={status} onSignIn={signIn} />
      ) : (
        <SignedInPanel status={status} fileId={config.fileId} onSyncNow={() => syncNow()} onSignOut={signOut} />
      )}
    </Card>
  );
}
