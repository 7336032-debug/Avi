"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProductSale } from "../actions";
import type { FormActionState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Checkbox } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_EMOJI } from "@/lib/categoryStyle";
import { PAYMENT_METHOD_LABELS } from "@/types/database";
import type { PaymentMethod } from "@/types/database";

const initialState: FormActionState = {};
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "bit", "transfer"];

export function ProductSaleForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createProductSale,
    initialState,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  useEffect(() => {
    if (state?.ok) router.push("/");
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5 px-4 pb-6">
      <input type="hidden" name="payment_method" value={paymentMethod} />

      <div>
        <Label htmlFor="product_name">שם המוצר</Label>
        <Input id="product_name" name="product_name" required />
      </div>

      <div>
        <Label htmlFor="amount">סכום (₪)</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          min="0"
          required
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

      <Checkbox name="is_paid" label="שולם" defaultChecked />

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {state?.error ? <ErrorBanner message={state.error} /> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "שומרת..." : "שמירת מכירה"}
      </Button>
    </form>
  );
}
