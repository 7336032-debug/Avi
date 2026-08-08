"use client";

// Turns a reports-list transaction row into an editable/deletable one — the
// owner's most-requested fix ("I made a mistake in the price"). Tapping a
// row expands it inline into an edit form, mirroring the existing
// pencil-icon-to-inline-form pattern used by TreatmentRow/CategoryRow in
// settings, and the delete confirm step mirrors SyncSection's
// disconnect-confirm box. Amount/date/payment-method fields reuse the same
// look as LogTreatmentForm for visual consistency.

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { isoDate } from "@/lib/dates";
import { PAYMENT_METHOD_EMOJI } from "@/lib/categoryStyle";
import { PAYMENT_METHOD_LABELS } from "@/types/database";
import type { PaymentMethod } from "@/types/database";
import type { Transaction } from "@/lib/transactions";
import {
  updateTreatmentLog,
  deleteTreatmentLog,
  updateProductSale,
  deleteProductSale,
  updateExpense,
  deleteExpense,
} from "./actions";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "bit", "transfer"];

function toIsoAtMidnight(dateStr: string) {
  // Date-only, same convention as log/actions.ts: no time-of-day picker, so
  // store at local midnight of the chosen day.
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = isoDate(new Date());
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
  const [date, setDate] = useState(isoDate(new Date(transaction.date)));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    transaction.paymentMethod ?? "cash",
  );
  const [text, setText] = useState(transaction.label);

  function startEdit() {
    setAmount(String(Math.abs(transaction.amount)));
    setDate(isoDate(new Date(transaction.date)));
    setPaymentMethod(transaction.paymentMethod ?? "cash");
    setText(transaction.label);
    setError(null);
    setConfirmingDelete(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setConfirmingDelete(false);
    setError(null);
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    const amountNum = Number(amount);

    const result =
      transaction.kind === "treatment"
        ? await updateTreatmentLog(transaction.id, {
            amount: amountNum,
            performedAt: toIsoAtMidnight(date),
            paymentMethod,
          })
        : transaction.kind === "product"
          ? await updateProductSale(transaction.id, {
              amount: amountNum,
              productName: text,
              soldAt: toIsoAtMidnight(date),
            })
          : await updateExpense(transaction.id, {
              amount: amountNum,
              description: text,
              spentAt: toIsoAtMidnight(date),
            });

    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    // No server round-trip in this app — a full reload is the established
    // way other write paths (BackupSection's import flow) refresh every
    // dependent total/list/calendar cell after a local mutation.
    window.location.reload();
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result =
      transaction.kind === "treatment"
        ? await deleteTreatmentLog(transaction.id)
        : transaction.kind === "product"
          ? await deleteProductSale(transaction.id)
          : await deleteExpense(transaction.id);

    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-1.5 py-1.5 text-start text-sm transition-colors hover:bg-surface-soft active:bg-surface-soft"
      >
        <div className="min-w-0">
          <p className="truncate">{transaction.label}</p>
          <p className="truncate text-sm text-text-muted">
            {formatDate(transaction.date)}
            {transaction.subLabel ? ` · ${transaction.subLabel}` : ""}
            {transaction.isPaid === false ? " · ממתין לתשלום" : ""}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "font-bold",
              transaction.amount < 0 ? "text-warning" : "text-success",
            )}
          >
            {formatCurrency(transaction.amount)}
          </span>
          <Pencil size={14} className="text-text-muted" aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-surface-soft p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`amount-${transaction.id}`}>סכום (₪)</Label>
          <Input
            id={`amount-${transaction.id}`}
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-lg font-bold"
          />
        </div>
        <div>
          <Label htmlFor={`date-${transaction.id}`}>תאריך</Label>
          <Input
            id={`date-${transaction.id}`}
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="h-12"
          />
        </div>
      </div>

      {transaction.kind !== "treatment" ? (
        <div>
          <Label htmlFor={`text-${transaction.id}`}>
            {transaction.kind === "product" ? "שם המוצר" : "תיאור"}
          </Label>
          <Input
            id={`text-${transaction.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      ) : null}

      {transaction.kind === "treatment" ? (
        <div>
          <Label>אמצעי תשלום</Label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                  paymentMethod === method
                    ? "gradient-primary text-accent-foreground shadow-sm shadow-accent/25"
                    : "bg-surface text-text-muted",
                )}
              >
                <span aria-hidden>{PAYMENT_METHOD_EMOJI[method]}</span>
                {PAYMENT_METHOD_LABELS[method]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}

      {!confirmingDelete ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={pending}
            className="flex-1"
          >
            {pending ? "שומרת..." : "שמירה"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={cancelEdit}
            disabled={pending}
          >
            ביטול
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-warning"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            aria-label="מחיקת תנועה"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl bg-warning-bg p-3">
          <p className="text-sm text-warning">למחוק את התנועה הזו לצמיתות?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "מוחקת..." : "כן, מחיקה"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
            >
              ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
