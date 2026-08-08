"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { ExpenseForm } from "./ExpenseForm";
import type { ExpenseCategory } from "@/types/database";

export default function NewExpensePage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase
      .from("expense_categories")
      .select("*")
      .order("sort_order")
      .returns<ExpenseCategory[]>()
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  return (
    <div>
      <Header title="הוספת הוצאה 🧾" />
      <ExpenseForm categories={categories} />
    </div>
  );
}
