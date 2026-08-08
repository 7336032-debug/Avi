import { createBrowserClient } from "@/lib/local/browserClient";

export interface FormActionState {
  error?: string;
  ok?: boolean;
}

export async function saveWeeklyGoal(
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const supabase = createBrowserClient();

  const weekStart = String(formData.get("week_start") ?? "");
  const targetCount = Number(formData.get("target_count") ?? 0);
  const targetRevenue = Number(formData.get("target_revenue") ?? 0);

  if (!weekStart || !targetCount || !targetRevenue) {
    return { error: "יש למלא את כל השדות" };
  }

  const { error } = await supabase.from("weekly_goals").upsert(
    {
      week_start: weekStart,
      target_count: targetCount,
      target_revenue: targetRevenue,
    },
    { onConflict: "week_start" },
  );

  if (error) return { error: "שגיאה בשמירת היעד" };

  return { ok: true };
}
