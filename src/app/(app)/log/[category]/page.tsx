"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { formatCurrency } from "@/lib/utils";
import { categoryFromSlug, getCategoryStyle, getTreatmentEmoji } from "@/lib/categoryStyle";
import { cn } from "@/lib/utils";
import type { Treatment } from "@/types/database";

export default function LogCategoryPage() {
  const params = useParams<{ category: string }>();
  const slug = params.category;
  const category = categoryFromSlug(slug);

  const [treatments, setTreatments] = useState<Treatment[] | null>(null);

  useEffect(() => {
    if (!category) return;
    const supabase = createBrowserClient();
    supabase
      .from("treatments")
      .select("*")
      .eq("category", category)
      .order("sort_order")
      .returns<Treatment[]>()
      .then(({ data }) => setTreatments(data ?? []));
  }, [category]);

  if (!category) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-text-muted">קטגוריה לא נמצאה</div>
    );
  }

  const style = getCategoryStyle(category);

  return (
    <div className="px-4">
      <Header title={`${style.emoji} ${category}`} />

      <div className="mt-4 grid grid-cols-2 gap-3 pb-8">
        {(treatments ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/log/${slug}/${t.id}`}
            className={cn(
              "card-interactive flex min-h-[128px] flex-col justify-between rounded-3xl border-2 p-4 text-right shadow-sm shadow-black/[0.04] active:scale-[0.97] transition-transform",
              style.bg,
              style.border,
            )}
          >
            <div>
              <p className="text-2xl" aria-hidden>
                {getTreatmentEmoji(t.name, category)}
              </p>
              <p className={cn("mt-1 text-[15px] font-bold leading-snug", style.text)}>
                {t.name}
              </p>
            </div>
            <p className="text-sm font-semibold text-text-muted">
              {t.price != null ? formatCurrency(t.price) : (t.price_note ?? "מחיר לעריכה")}
              {t.duration_minutes != null ? ` · ${t.duration_minutes} דק'` : ""}
            </p>
          </Link>
        ))}
        {treatments != null && treatments.length === 0 && (
          <p className="col-span-2 py-10 text-center text-sm text-text-muted">
            אין עדיין טיפולים בקטגוריה הזו. אפשר להוסיף במחירון בהגדרות.
          </p>
        )}
      </div>
    </div>
  );
}
