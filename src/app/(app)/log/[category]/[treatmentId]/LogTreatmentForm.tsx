"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logTreatment } from "../../actions";
import type { LogState } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_EMOJI } from "@/lib/categoryStyle";
import { PAYMENT_METHOD_LABELS } from "@/types/database";
import type { PaymentMethod, Treatment } from "@/types/database";

const initialState: LogState = {};
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "bit", "transfer"];

function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function LogTreatmentForm({
  treatment,
  categorySlug,
}: {
  treatment: Treatment;
  categorySlug: string;
}) {
  const router = useRouter();
  const action = logTreatment.bind(null, treatment.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [showProduct, setShowProduct] = useState(false);
  const today = todayIso();
  const [date, setDate] = useState(today);

  useEffect(() => {
    if (state?.ok) {
      router.push("/?logged=1");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6 px-4 pb-6 pt-5">
      <input type="hidden" name="payment_method" value={paymentMethod} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">מחיר (₪)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            defaultValue={treatment.price ?? ""}
            required
            className="h-14 text-lg font-bold"
          />
        </div>
        <div>
          <Label htmlFor="duration_minutes">משך (דקות)</Label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            inputMode="numeric"
            min="5"
            step="5"
            defaultValue={treatment.duration_minutes ?? 30}
            required
            className="h-14 text-lg font-bold"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>מתי בוצע הטיפול?</Label>
          <button
            type="button"
            onClick={() => setDate(today)}
            className="text-sm font-semibold text-accent-strong underline underline-offset-2"
          >
            היום
          </button>
        </div>
        <Input
          type="date"
          name="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          required
          className="h-14 text-lg font-bold"
        />
      </div>

      <div>
        <Label>אמצעי תשלום</Label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={cn(
                "flex h-16 flex-col items-center justify-center rounded-2xl text-sm font-semibold transition-colors",
                paymentMethod === method
                  ? "gradient-primary text-accent-foreground shadow-sm shadow-accent/25"
                  : "bg-surface-soft text-text-muted",
              )}
            >
              <span aria-hidden>{PAYMENT_METHOD_EMOJI[method]}</span>
              {PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowProduct((v) => !v)}
        className="text-sm font-semibold text-accent-strong underline underline-offset-2"
      >
        {showProduct ? "− הסרת מכירת מוצר" : "+ נמכר גם מוצר באותה פגישה?"}
      </button>

      {showProduct ? (
        <div className="space-y-3 rounded-2xl bg-surface-soft p-3">
          <div>
            <Label htmlFor="product_name">שם המוצר</Label>
            <Input id="product_name" name="product_name" />
          </div>
          <div>
            <Label htmlFor="product_amount">מחיר המוצר (₪)</Label>
            <Input id="product_amount" name="product_amount" type="number" min="0" />
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor="notes">הערות (אופציונלי)</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {state?.error ? <ErrorBanner message={state.error} /> : null}

      <Button type="submit" size="lg" className="w-full h-16 text-lg" disabled={pending}>
        {pending ? "שומרת..." : "✅ תיעוד הטיפול"}
      </Button>

      <a
        href={`/log/${categorySlug}`}
        className="block text-center text-sm text-text-muted underline underline-offset-2"
      >
        ביטול, חזרה לרשימה
      </a>
    </form>
  );
}
