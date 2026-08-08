"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { weekStart, isoDate } from "@/lib/dates";
import { getFacialsWeekComparison } from "@/lib/reports";
import { GoalForm } from "./GoalForm";
import type { WeeklyGoal } from "@/types/database";

export default function WeeklyGoalPage() {
  const [suggestedCount, setSuggestedCount] = useState<number | null>(null);
  const [suggestedRevenue, setSuggestedRevenue] = useState<number | null>(null);
  const [lastWeekCount, setLastWeekCount] = useState<number | null>(null);

  const thisWeek = weekStart(new Date());

  useEffect(() => {
    const supabase = createBrowserClient();
    const thisWeekEnd = new Date(thisWeek);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
    const lastWeekStart = new Date(thisWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    Promise.all([
      supabase
        .from("weekly_goals")
        .select("*")
        .eq("week_start", isoDate(thisWeek))
        .maybeSingle<WeeklyGoal>(),
      getFacialsWeekComparison(supabase, thisWeek, thisWeekEnd, lastWeekStart, thisWeek),
    ]).then(([{ data: current }, comparison]) => {
      setSuggestedCount(Math.max(current?.target_count ?? 0, comparison.autoTargetCount));
      setSuggestedRevenue(Math.max(current?.target_revenue ?? 0, comparison.autoTargetRevenue));
      setLastWeekCount(comparison.lastWeekCount);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Header title="יעד שבועי 🎯" />
      <div className="px-4">
        <Card className="mt-2 mb-4">
          <p className="text-sm text-text-muted">
            שבוע נוכחי: {isoDate(thisWeek)}
            <br />
            השבוע שעבר בוצעו {lastWeekCount ?? "…"} טיפולי פנים ✨ — ההצעה כאן
            היא לפחות 10% יותר, כדי שתמיד תהיה צמיחה.
          </p>
        </Card>
      </div>
      {suggestedCount != null && suggestedRevenue != null ? (
        <GoalForm
          weekStartIso={isoDate(thisWeek)}
          suggestedCount={suggestedCount}
          suggestedRevenue={suggestedRevenue}
        />
      ) : null}
    </div>
  );
}
