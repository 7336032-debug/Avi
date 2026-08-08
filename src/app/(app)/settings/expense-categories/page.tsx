"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { CategoryRow } from "./CategoryRow";
import { AddCategoryForm } from "./AddCategoryForm";
import type { ExpenseCategory } from "@/types/database";

async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("expense_categories")
    .select("*")
    .order("sort_order")
    .returns<ExpenseCategory[]>();
  return data ?? [];
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const load = useCallback(() => {
    fetchExpenseCategories().then(setCategories);
  }, []);

  useEffect(() => {
    fetchExpenseCategories().then(setCategories);
  }, []);

  return (
    <div className="px-4">
      <Header title="קטגוריות הוצאה 🧾" />
      <div className="mt-4 space-y-2 pb-8">
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} onSaved={load} />
        ))}
        <AddCategoryForm onSaved={load} />
      </div>
    </div>
  );
}
