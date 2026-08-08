"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { TreatmentRow } from "./TreatmentRow";
import { AddTreatmentForm } from "./AddTreatmentForm";
import { getCategoryStyle } from "@/lib/categoryStyle";
import type { Treatment } from "@/types/database";

async function fetchTreatments(): Promise<Treatment[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from("treatments")
    .select("*")
    .order("sort_order")
    .returns<Treatment[]>();
  return data ?? [];
}

export default function TreatmentsSettingsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Exposed to children so they can trigger a refresh after a mutation —
  // this is only ever called from event handlers, never from the effect
  // below (which fetches inline instead, on its own).
  const load = useCallback(() => {
    fetchTreatments().then((data) => {
      setTreatments(data);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    fetchTreatments().then((data) => {
      setTreatments(data);
      setLoaded(true);
    });
  }, []);

  const grouped = new Map<string, Treatment[]>();
  for (const t of treatments) {
    grouped.set(t.category, [...(grouped.get(t.category) ?? []), t]);
  }
  const categories = Array.from(grouped.keys());

  return (
    <div className="px-4">
      <Header title="ניהול מחירון 💅" />
      <div className="mt-4 space-y-5 pb-8">
        {Array.from(grouped.entries()).map(([category, list]) => {
          const style = getCategoryStyle(category);
          return (
            <div key={category}>
              <p className="mb-2 text-sm font-semibold text-text">
                <span aria-hidden>{style.emoji}</span> {category}
              </p>
              <div className="space-y-2">
                {list.map((t) => (
                  <TreatmentRow key={t.id} treatment={t} onSaved={load} />
                ))}
              </div>
            </div>
          );
        })}
        {loaded && treatments.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">
            אין עדיין טיפולים במחירון. אפשר להוסיף למטה 👇
          </p>
        ) : null}
        <AddTreatmentForm categories={categories} onSaved={load} />
      </div>
    </div>
  );
}
