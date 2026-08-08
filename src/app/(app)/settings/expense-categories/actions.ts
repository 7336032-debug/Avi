import { createBrowserClient } from "@/lib/local/browserClient";

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s ? Number(s) : null;
}

export async function createExpenseCategory(formData: FormData) {
  const supabase = createBrowserClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("expense_categories").insert({
    name,
    default_amount: numOrNull(formData.get("default_amount")),
  });
}

export async function updateExpenseCategory(id: string, formData: FormData) {
  const supabase = createBrowserClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase
    .from("expense_categories")
    .update({ name, default_amount: numOrNull(formData.get("default_amount")) })
    .eq("id", id);
}

export async function deleteExpenseCategory(id: string) {
  const supabase = createBrowserClient();
  await supabase.from("expense_categories").delete().eq("id", id);
}
