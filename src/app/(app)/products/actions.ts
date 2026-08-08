import { createBrowserClient } from "@/lib/local/browserClient";
import type { PaymentMethod } from "@/types/database";

export interface FormActionState {
  error?: string;
  ok?: boolean;
}

export async function createProductSale(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = createBrowserClient();

  const productName = String(formData.get("product_name") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const paymentMethod = String(formData.get("payment_method") ?? "cash") as PaymentMethod;
  const isPaid = formData.get("is_paid") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!productName) return { error: "יש להזין שם מוצר" };
  if (!amount || amount <= 0) return { error: "יש להזין סכום תקין" };

  const { error } = await supabase.from("product_sales").insert({
    product_name: productName,
    amount,
    payment_method: paymentMethod,
    is_paid: isPaid,
    notes,
    sold_at: new Date().toISOString(),
  });

  if (error) return { error: "שגיאה בשמירת המכירה" };

  return { ok: true };
}
