// Edit/delete actions for the reports transaction list — lets the owner fix
// a mistake (wrong amount, wrong date, logged by accident) after the fact.
// Same plain-async-function-over-browserClient pattern as the other
// actions.ts files in this app (no "use server" — everything runs
// client-side against localStorage).

import { createBrowserClient } from "@/lib/local/browserClient";
import type { PaymentMethod } from "@/types/database";

export interface FormActionState {
  error?: string;
  ok?: boolean;
}

export async function updateTreatmentLog(
  id: string,
  input: { amount: number; performedAt: string; paymentMethod: PaymentMethod },
): Promise<FormActionState> {
  if (!input.amount || input.amount <= 0) return { error: "יש להזין סכום תקין" };

  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("treatment_log")
    .update({
      amount: input.amount,
      performed_at: input.performedAt,
      payment_method: input.paymentMethod,
    })
    .eq("id", id);

  if (error) return { error: "שגיאה בעדכון, נסי שוב" };
  return { ok: true };
}

export async function deleteTreatmentLog(id: string): Promise<FormActionState> {
  const supabase = createBrowserClient();
  const { error } = await supabase.from("treatment_log").delete().eq("id", id);
  if (error) return { error: "שגיאה במחיקה" };
  return { ok: true };
}

export async function updateProductSale(
  id: string,
  input: { amount: number; productName: string; soldAt: string },
): Promise<FormActionState> {
  if (!input.amount || input.amount <= 0) return { error: "יש להזין סכום תקין" };
  if (!input.productName.trim()) return { error: "יש להזין שם מוצר" };

  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("product_sales")
    .update({
      amount: input.amount,
      product_name: input.productName.trim(),
      sold_at: input.soldAt,
    })
    .eq("id", id);

  if (error) return { error: "שגיאה בעדכון, נסי שוב" };
  return { ok: true };
}

export async function deleteProductSale(id: string): Promise<FormActionState> {
  const supabase = createBrowserClient();
  const { error } = await supabase.from("product_sales").delete().eq("id", id);
  if (error) return { error: "שגיאה במחיקה" };
  return { ok: true };
}

export async function updateExpense(
  id: string,
  input: { amount: number; description: string; spentAt: string },
): Promise<FormActionState> {
  if (!input.amount || input.amount <= 0) return { error: "יש להזין סכום תקין" };

  const supabase = createBrowserClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      amount: input.amount,
      description: input.description.trim() || null,
      spent_at: input.spentAt,
    })
    .eq("id", id);

  if (error) return { error: "שגיאה בעדכון, נסי שוב" };
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<FormActionState> {
  const supabase = createBrowserClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: "שגיאה במחיקה" };
  return { ok: true };
}
