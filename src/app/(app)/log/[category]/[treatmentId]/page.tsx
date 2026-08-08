"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { categoryFromSlug, getCategoryStyle, getTreatmentEmoji } from "@/lib/categoryStyle";
import { LogTreatmentForm } from "./LogTreatmentForm";
import type { Treatment } from "@/types/database";

export default function LogTreatmentPage() {
  const params = useParams<{ category: string; treatmentId: string }>();
  const slug = params.category;
  const treatmentId = params.treatmentId;
  const category = categoryFromSlug(slug);

  const [treatment, setTreatment] = useState<Treatment | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase
      .from("treatments")
      .select("*")
      .eq("id", treatmentId)
      .maybeSingle<Treatment>()
      .then(({ data }) => setTreatment(data));
  }, [treatmentId]);

  if (!category) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-text-muted">קטגוריה לא נמצאה</div>
    );
  }

  if (treatment === undefined) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-text-muted">טוענת…</div>
    );
  }

  if (treatment === null) {
    return (
      <div className="px-4 pt-8 text-center text-sm text-text-muted">הטיפול לא נמצא</div>
    );
  }

  const style = getCategoryStyle(category);
  const emoji = getTreatmentEmoji(treatment.name, category);

  return (
    <div>
      <Header title={`${emoji} ${treatment.name}`} />
      <div className="px-4 pt-3">
        <div className={`rounded-2xl ${style.bg} ${style.text} px-4 py-3 text-sm font-semibold`}>
          {treatment.name}
          {treatment.description ? (
            <span className="mt-1 block text-sm font-normal opacity-80">
              {treatment.description}
            </span>
          ) : null}
        </div>
      </div>
      <LogTreatmentForm treatment={treatment} categorySlug={slug} />
    </div>
  );
}
