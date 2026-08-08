"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays } from "date-fns";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  getMonthlySummary,
  getFacialsWeekProgress,
  getFacialsWeekComparison,
  getFacialsTreatmentUsage,
  getCategoryCounts,
  getPaymentMethodBreakdown,
} from "@/lib/reports";
import type {
  MonthlySummary,
  FacialsProgress,
  FacialsWeekComparison,
  FacialsTreatmentUsage,
  CategoryCounts,
  PaymentMethodBreakdown,
} from "@/lib/reports";
import { weekStart, isoDate } from "@/lib/dates";
import { cn, formatCurrency } from "@/lib/utils";
import { getCategoryStyle, getTreatmentEmoji, PAYMENT_METHOD_EMOJI } from "@/lib/categoryStyle";
import { computeWorkDayStreak } from "@/lib/streak";
import { GoalCelebration } from "@/components/Celebration";
import { FACIALS_CATEGORY, NAILS_CATEGORY } from "@/types/database";
import type { WeeklyGoal, TreatmentLog } from "@/types/database";

interface DashboardData {
  summary: MonthlySummary;
  facialsProgress: FacialsProgress;
  facialsComparison: FacialsWeekComparison;
  facialsUsage: FacialsTreatmentUsage[];
  todayCounts: CategoryCounts;
  weekCounts: CategoryCounts;
  todayPayments: PaymentMethodBreakdown[];
  goal: WeeklyGoal | null;
  streak: number;
}

function celebratedKey(weekStartIso: string) {
  return `keren_amar_celebrated_${weekStartIso}`;
}

async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createBrowserClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = addDays(todayStart, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const wStart = weekStart(now);
  const wEnd = addDays(wStart, 7);
  const lastWStart = addDays(wStart, -7);

  const [
    summary,
    facialsProgress,
    facialsComparison,
    facialsUsage,
    todayCounts,
    weekCounts,
    todayPayments,
    { data: goal },
    { data: allLogs },
  ] = await Promise.all([
    getMonthlySummary(supabase, monthStart, monthEnd),
    getFacialsWeekProgress(supabase, wStart, wEnd),
    getFacialsWeekComparison(supabase, wStart, wEnd, lastWStart, wStart),
    getFacialsTreatmentUsage(supabase, wStart, wEnd),
    getCategoryCounts(supabase, todayStart, todayEnd),
    getCategoryCounts(supabase, wStart, wEnd),
    getPaymentMethodBreakdown(supabase, todayStart, todayEnd),
    supabase.from("weekly_goals").select("*").eq("week_start", isoDate(wStart)).maybeSingle<WeeklyGoal>(),
    supabase.from("treatment_log").select("performed_at").returns<Pick<TreatmentLog, "performed_at">[]>(),
  ]);

  const streak = computeWorkDayStreak((allLogs ?? []).map((l) => l.performed_at));

  return {
    summary,
    facialsProgress,
    facialsComparison,
    facialsUsage,
    todayCounts,
    weekCounts,
    todayPayments,
    goal: goal ?? null,
    streak,
  };
}

// Glanceable "how am I doing right now" snapshot — a ring gauge for the
// weekly facials goal plus today's income as one big number, replacing a
// stack of prose. Inspired by (not copied from) tochnit-hachlama's
// HealthGauge.jsx / BusinessPaceCard.jsx.
function StatusSnapshot({
  todayTotal,
  todayPayments,
  todayTreatmentCount,
  facialsCompleted,
  facialsTarget,
  hitGoal,
}: {
  todayTotal: number;
  todayPayments: PaymentMethodBreakdown[];
  todayTreatmentCount: number;
  facialsCompleted: number;
  facialsTarget: number;
  hitGoal: boolean;
}) {
  const pct = facialsTarget > 0 ? Math.min((facialsCompleted / facialsTarget) * 100, 100) : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const ringColor = hitGoal
    ? "var(--color-success)"
    : pct >= 60
      ? "var(--color-gold)"
      : "var(--color-facials)";
  const statusLabel = hitGoal
    ? "עברת את היעד 🎉"
    : pct >= 60
      ? "כמעט שם 💪"
      : pct > 0
        ? "בתנועה 🎯"
        : "בואי נתחיל ✨";

  return (
    <Card className="gradient-header border-accent-soft">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
          <svg viewBox="0 0 110 110" width={100} height={100} className="-rotate-90">
            <circle cx="55" cy="55" r={radius} strokeWidth={10} fill="none" stroke="var(--color-border-soft)" />
            <circle
              cx="55"
              cy="55"
              r={radius}
              strokeWidth={10}
              fill="none"
              stroke={ringColor}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold" style={{ color: ringColor }}>
              {facialsCompleted}/{facialsTarget}
            </span>
            <span className="text-[10px] font-medium text-text-muted">טיפולי פנים</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-text-muted">💵 הכנסה היום</p>
          <p className="text-[28px] font-extrabold leading-tight text-accent-strong">
            {formatCurrency(todayTotal)}
          </p>
          <p className="mt-1 text-sm font-bold" style={{ color: ringColor }}>
            {statusLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {todayPayments
          .filter((p) => p.amount > 0)
          .map((p) => (
            <span
              key={p.method}
              className="rounded-full bg-surface px-2.5 py-1 text-sm font-semibold shadow-sm shadow-black/[0.03]"
            >
              {PAYMENT_METHOD_EMOJI[p.method]} {formatCurrency(p.amount)}
            </span>
          ))}
        <span className="rounded-full bg-surface px-2.5 py-1 text-sm text-text-muted shadow-sm shadow-black/[0.03]">
          📝 {todayTreatmentCount} טיפולים
        </span>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const logged = searchParams.get("logged");

  const [data, setData] = useState<DashboardData | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData().then((next) => {
      setData(next);

      const wStartIso = isoDate(weekStart(new Date()));
      const effectiveTargetCount = Math.max(
        next.goal?.target_count ?? 0,
        next.facialsComparison.autoTargetCount,
      );
      const hit = effectiveTargetCount > 0 && next.facialsProgress.completedCount >= effectiveTargetCount;
      if (hit && typeof window !== "undefined") {
        const key = celebratedKey(wStartIso);
        if (!window.localStorage.getItem(key)) {
          window.localStorage.setItem(key, "1");
          setCelebrationOpen(true);
        }
      }
    });
  }, []);

  if (!data) {
    return (
      <div className="px-4 pt-4">
        <header className="flex items-center justify-between pt-4 pb-2">
          <h1 className="font-heading text-xl">שלום קרן 👋</h1>
          <Image src="/logo-mark.png" alt="" width={24} height={34} />
        </header>
        <p className="mt-8 text-center text-sm text-text-muted">טוענת נתונים…</p>
      </div>
    );
  }

  const {
    summary,
    facialsProgress,
    facialsComparison,
    facialsUsage,
    todayCounts,
    weekCounts,
    todayPayments,
    goal,
    streak,
  } = data;

  const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0);

  const effectiveTargetCount = Math.max(goal?.target_count ?? 0, facialsComparison.autoTargetCount);
  const effectiveTargetRevenue = Math.max(goal?.target_revenue ?? 0, facialsComparison.autoTargetRevenue);
  const remainingForGoal = Math.max(effectiveTargetCount - facialsProgress.completedCount, 0);
  const hitGoal = facialsProgress.completedCount >= effectiveTargetCount;
  const suggestedTreatments = facialsUsage
    .slice()
    .sort((a, b) => a.count - b.count)
    .slice(0, 2);

  const weekTotal = weekCounts.nailsCount + weekCounts.facialsCount;
  const facialsSharePct = weekTotal > 0 ? Math.round((weekCounts.facialsCount / weekTotal) * 100) : 0;
  const nailsStyle = getCategoryStyle(NAILS_CATEGORY);
  const facialsStyle = getCategoryStyle(FACIALS_CATEGORY);

  return (
    <div className="px-4">
      <header className="flex items-center justify-between pt-4 pb-2">
        <h1 className="font-heading text-xl">שלום קרן 👋</h1>
        <Image src="/logo-mark.png" alt="" width={24} height={34} />
      </header>

      {logged ? (
        <div className="mt-2 rounded-2xl bg-success-bg px-4 py-2.5 text-center text-sm font-semibold text-success">
          ✅ הטיפול תועד בהצלחה!
        </div>
      ) : null}

      {streak > 0 ? (
        <div
          className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-gold-bg px-4 py-2 text-center text-sm font-semibold text-gold"
          style={{ animation: "toast-in 0.3s ease-out" }}
        >
          🔥 {streak} {streak === 1 ? "יום ברצף עם טיפולים" : "ימים ברצף עם טיפולים"}
        </div>
      ) : null}

      <p className="mt-4 mb-2 text-sm font-semibold text-text">מה תיעדת עכשיו?</p>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/log/nails"
          className={cn(
            "card-interactive flex h-36 flex-col items-center justify-center gap-1.5 rounded-3xl shadow-md active:scale-[0.97] transition-transform",
            nailsStyle.solidBg,
          )}
        >
          <span className="text-4xl" aria-hidden>
            💅
          </span>
          <span className="text-lg font-bold text-white">ציפורניים</span>
          <span className="text-sm font-medium text-white/90">
            {weekCounts.nailsCount} השבוע
          </span>
        </Link>
        <Link
          href="/log/facials"
          className={cn(
            "card-interactive flex h-36 flex-col items-center justify-center gap-1.5 rounded-3xl shadow-md active:scale-[0.97] transition-transform",
            facialsStyle.solidBg,
          )}
        >
          <span className="text-4xl" aria-hidden>
            ✨
          </span>
          <span className="text-lg font-bold text-white">טיפולי פנים</span>
          <span className="text-sm font-medium text-white/90">
            {weekCounts.facialsCount} השבוע
          </span>
        </Link>
      </div>

      <section className="mt-5">
        <StatusSnapshot
          todayTotal={todayTotal}
          todayPayments={todayPayments}
          todayTreatmentCount={todayCounts.nailsCount + todayCounts.facialsCount}
          facialsCompleted={facialsProgress.completedCount}
          facialsTarget={effectiveTargetCount}
          hitGoal={hitGoal}
        />
      </section>

      <section className="mt-3">
        <Card>
          <CardTitle>⚖️ מאזן השבוע — ציפורניים מול טיפולי פנים</CardTitle>
          {weekTotal === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">
              עוד לא תועדו טיפולים השבוע
            </p>
          ) : (
            <>
              <div className="flex h-4 overflow-hidden rounded-full bg-border-soft">
                <div
                  className="h-full bg-nails"
                  style={{ width: `${100 - facialsSharePct}%` }}
                />
                <div className="h-full bg-facials" style={{ width: `${facialsSharePct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-nails">
                  💅 {weekCounts.nailsCount} ציפורניים
                </span>
                <span className="font-semibold text-facials">
                  ✨ {weekCounts.facialsCount} טיפולי פנים
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-text">
                {facialsSharePct >= 60
                  ? "🎉 מעולה! רוב העבודה השבוע היא טיפולי פנים — בדיוק לשם זה חותרים."
                  : facialsSharePct >= 40
                    ? "💪 קרוב לאיזון — עוד קצת יותר טיפולי פנים ופחות ציפורניים ותהיה שם."
                    : "🎯 השבוע עדיין נשען בעיקר על ציפורניים — כל טיפול פנים נוסף מקרב אותך ליעד."}
              </p>
            </>
          )}
        </Card>
      </section>

      <section className="mt-3">
        <Card className={hitGoal ? "border-success/40" : undefined}>
          <CardTitle>✨ יעד שבועי — טיפולי פנים (לא ציפורניים)</CardTitle>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-semibold">
              {facialsProgress.completedCount} / {effectiveTargetCount} טיפולים
            </span>
            <span className="text-sm text-text-muted">
              {formatCurrency(facialsProgress.completedRevenue)} /{" "}
              {formatCurrency(effectiveTargetRevenue)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-border-soft overflow-hidden">
            <div
              className={cn("h-full transition-all", hitGoal ? "bg-success" : "gradient-primary")}
              style={{
                width: `${Math.min(
                  (facialsProgress.completedCount / Math.max(effectiveTargetCount, 1)) * 100,
                  100,
                )}%`,
              }}
            />
          </div>

          {hitGoal ? (
            <p className="mt-3 text-sm font-semibold text-success">
              🎉 כל הכבוד! עברת את היעד השבועי — גידול של לפחות 10% משבוע שעבר
              ({facialsComparison.lastWeekCount} → {facialsProgress.completedCount}). תמשיכי כך!
            </p>
          ) : (
            <div className="mt-3 rounded-xl bg-facials-bg/60 p-3">
              <p className="text-sm font-semibold text-facials">
                💪 עוד {remainingForGoal} טיפולי פנים השבוע כדי לגדול לפחות ב-10%
                משבוע שעבר ({facialsComparison.lastWeekCount} ➜ {effectiveTargetCount})
              </p>
              {suggestedTreatments.length > 0 ? (
                <p className="mt-1.5 text-sm text-text-muted">
                  כדאי להציע ללקוחות השבוע:{" "}
                  {suggestedTreatments
                    .map((t) => `${getTreatmentEmoji(t.name, FACIALS_CATEGORY)} ${t.name}`)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-3 mb-6">
        <Card>
          <CardTitle>💰 הכנסות והוצאות החודש</CardTitle>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-text-muted">רווח נקי</span>
            <span className="text-2xl font-bold text-accent-strong">
              {formatCurrency(summary.profit)}
            </span>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">הכנסה מטיפולים</span>
              <span>{formatCurrency(summary.treatmentIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">הכנסה ממכירת מוצרים</span>
              <span>{formatCurrency(summary.productIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">הוצאות</span>
              <span>{formatCurrency(summary.totalExpenses)}</span>
            </div>
          </div>
        </Card>
      </section>

      <GoalCelebration
        open={celebrationOpen}
        title="עברת את היעד השבועי! 🎉"
        message={`${facialsProgress.completedCount} טיפולי פנים השבוע — גידול יפה משבוע שעבר. ככה ממשיכים!`}
        onDismiss={() => setCelebrationOpen(false)}
      />
    </div>
  );
}
