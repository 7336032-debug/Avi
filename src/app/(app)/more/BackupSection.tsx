"use client";

// Manual export/import — the local-first replacement for "sign out"/account
// management. All data lives in this device's localStorage; this section is
// the escape hatch for moving it to another device or keeping an off-device
// backup. Cross-device pairing-code sync (like tochnit-hachlama's) is a
// stretch goal and intentionally stubbed as "coming soon" here.

import { useRef, useState } from "react";
import { Download, Upload, RefreshCcw } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { exportStoreJson, importStoreJson } from "@/lib/local/browserStore";

export function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const json = exportStoreJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `keren-amar-גיבוי-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage("✅ הקובץ ירד למכשיר");
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importStoreJson(String(reader.result));
        setMessage("✅ הנתונים שוחזרו בהצלחה — טוענת מחדש...");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        setMessage("⚠️ הקובץ לא תקין");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <Card>
      <CardTitle>💾 גיבוי ושחזור</CardTitle>
      <p className="text-sm text-text-muted">
        כל המידע נשמר במכשיר הזה בלבד (ללא התחברות, ללא שרת). אפשר לייצא קובץ
        גיבוי ולשחזר אותו במכשיר אחר.
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={16} />
          ייצוא גיבוי
        </Button>
        <Button variant="secondary" size="sm" onClick={handleImportClick}>
          <Upload size={16} />
          ייבוא / שחזור
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      {message ? <p className="mt-2 text-sm text-text-muted">{message}</p> : null}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-soft px-3 py-2 text-sm text-text-muted">
        <RefreshCcw size={16} className="shrink-0" />
        <span>סנכרון בין מכשירים עם קוד זיווג — בקרוב ✨</span>
      </div>
    </Card>
  );
}
