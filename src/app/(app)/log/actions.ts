import { createBrowserClient } from "@/lib/local/browserClient";
import { slugFromCategory } from "@/lib/categoryStyle";
import type { PaymentMethod } from "@/types/database";

export interface LogState {
  error?: string;
  ok?: boolean;
  slug?: string;
}

export async function logTreatment(
  treatmentId: string,
  _prevState: LogState,
  formData: FormData,
): Promise<LogState> {
  const supabase = createBrowserClient();

  const { data: treatment } = await supabase
    .from("treatments")
    .select("*")
    .eq("id", treatmentId)
    .maybeSingle();

  if (!treatment) return { error: "הטיפול לא נמצא" };

  const amount = Number(formData.get("amount") ?? 0);
  const durationMinutes = Number(
    formData.get("duration_minutes") ?? treatment.duration_minutes ?? 30,
  );
  const paymentMethod = String(formData.get("payment_method") ?? "cash") as PaymentMethod;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const productName = String(formData.get("product_name") ?? "").trim();
  const productAmountRaw = String(formData.get("product_amount") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");

  if (!amount || amount <= 0) return { error: "יש להזין סכום תקין" };

  // Date-only: no time-of-day picker anymore, so treatments are stored at
  // local midnight of the chosen day.
  const performedAtDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  if (performedAtDate.getTime() > todayMidnight.getTime()) {
    return { error: "לא ניתן לתעד טיפול לתאריך שעדיין לא הגיע" };
  }
  const performedAt = performedAtDate.toISOString();

  const { data: log, error } = await supabase
    .from("treatment_log")
    .insert({
      treatment_id: treatment.id,
      treatment_name: treatment.name,
      amount,
      duration_minutes: durationMinutes,
      payment_method: paymentMethod,
      is_paid: true,
      performed_at: performedAt,
      notes,
    })
    .select("id")
    .single();

  if (error || !log) {
    return { error: "שגיאה בשמירת התיעוד, נסי שוב" };
  }

  if (productName && productAmountRaw) {
    await supabase.from("product_sales").insert({
      treatment_log_id: (log as { id: string }).id,
      product_name: productName,
      amount: Number(productAmountRaw),
      is_paid: true,
      sold_at: performedAt,
    });
  }

  const slug = slugFromCategory(treatment.category as string) ?? "facials";
  return { ok: true, slug };
}
