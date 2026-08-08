import { createBrowserClient } from "@/lib/local/browserClient";

export interface FormActionState {
  error?: string;
  ok?: boolean;
}

export async function createExpense(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = createBrowserClient();

  const categoryId = String(formData.get("category_id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const spentAt = String(formData.get("spent_at") ?? "");

  if (!amount || amount <= 0) return { error: "יש להזין סכום תקין" };

  const { error } = await supabase.from("expenses").insert({
    category_id: categoryId,
    description,
    amount,
    notes,
    spent_at: spentAt ? new Date(`${spentAt}T00:00:00`).toISOString() : new Date().toISOString(),
  });

  if (error) return { error: "שגיאה בשמירת ההוצאה" };

  return { ok: true };
}
