import type { createBrowserClient } from "@/lib/local/browserClient";
import { PAYMENT_METHOD_LABELS } from "@/types/database";

// Duck-typed client shape — see reports.ts for why this isn't imported
// from @supabase/supabase-js anymore.
type SupabaseClient = ReturnType<typeof createBrowserClient>;
import type { PaymentMethod } from "@/types/database";

export interface Transaction {
  id: string;
  kind: "treatment" | "product" | "expense";
  date: string;
  label: string;
  subLabel: string | null;
  amount: number;
  isPaid: boolean | null;
}

export async function getTransactions(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<Transaction[]> {
  const [{ data: logs }, { data: sales }, { data: expenses }] = await Promise.all([
    supabase
      .from("treatment_log")
      .select("id, amount, performed_at, treatment_name, payment_method, is_paid")
      .gte("performed_at", start.toISOString())
      .lt("performed_at", end.toISOString()),
    supabase
      .from("product_sales")
      .select("id, amount, sold_at, product_name, is_paid")
      .gte("sold_at", start.toISOString())
      .lt("sold_at", end.toISOString()),
    supabase
      .from("expenses")
      .select("id, amount, spent_at, description, category:expense_categories(name)")
      .gte("spent_at", start.toISOString())
      .lt("spent_at", end.toISOString()),
  ]);

  const name = (c: unknown) =>
    Array.isArray(c) ? ((c[0] as { name?: string })?.name ?? null) : ((c as { name?: string } | null)?.name ?? null);

  const items: Transaction[] = [
    ...(logs ?? []).map((l) => ({
      id: l.id as string,
      kind: "treatment" as const,
      date: l.performed_at as string,
      label: l.treatment_name as string,
      subLabel: PAYMENT_METHOD_LABELS[l.payment_method as PaymentMethod] ?? null,
      amount: Number(l.amount),
      isPaid: l.is_paid as boolean,
    })),
    ...(sales ?? []).map((s) => ({
      id: s.id as string,
      kind: "product" as const,
      date: s.sold_at as string,
      label: s.product_name as string,
      subLabel: "מכירת מוצר",
      amount: Number(s.amount),
      isPaid: s.is_paid as boolean,
    })),
    ...(expenses ?? []).map((e) => ({
      id: e.id as string,
      kind: "expense" as const,
      date: e.spent_at as string,
      label: e.description || name(e.category) || "הוצאה",
      subLabel: name(e.category),
      amount: -Number(e.amount),
      isPaid: null,
    })),
  ];

  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
