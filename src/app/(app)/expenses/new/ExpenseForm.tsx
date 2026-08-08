"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "../actions";
import type { FormActionState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { isoDate } from "@/lib/dates";
import type { ExpenseCategory } from "@/types/database";

const initialState: FormActionState = {};

export function ExpenseForm({ categories }: { categories: ExpenseCategory[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createExpense,
    initialState,
  );
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (state?.ok) router.push("/");
  }, [state, router]);

  function onCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat?.default_amount != null) {
      setAmount(String(cat.default_amount));
    }
  }

  return (
    <form action={formAction} className="space-y-5 px-4 pb-6">
      <div>
        <Label htmlFor="category_id">קטגוריה</Label>
        <Select
          id="category_id"
          name="category_id"
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">בחרי קטגוריה</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="description">תיאור</Label>
        <Input id="description" name="description" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">סכום (₪)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="spent_at">תאריך</Label>
          <Input
            id="spent_at"
            name="spent_at"
            type="date"
            defaultValue={isoDate(new Date())}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">הערות</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {state?.error ? <ErrorBanner message={state.error} /> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "שומרת..." : "שמירת הוצאה"}
      </Button>
    </form>
  );
}
