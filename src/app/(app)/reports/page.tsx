"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react";
import { createBrowserClient } from "@/lib/local/browserClient";
import { Header } from "@/components/layout/Header";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  getMonthlySummary,
  getIncomePerHourByTreatment,
  getNailsFacialsTrend,
  getDailyBreakdown,
  getPeriodStats,
  getPaymentMethodBreakdown,
} from "@/lib/reports";
import type {
  MonthlySummary,
  TreatmentStat,
  NailsFacialsTrendPoint,
  DailyBreakdown,
  PeriodStats,
  PaymentMethodBreakdown,
} from "@/lib/reports";
import { PAYMENT_METHOD_LABELS } from "@/types/database";
import { PAYMENT_METHOD_EMOJI } from "@/lib/categoryStyle";
import { getTransactions } from "@/lib/transactions";
import type { Transaction } from "@/lib/transactions";
import { NailsFacialsChart } from "@/components/charts/NailsFacialsChart";
import { MonthCalendarGrid } from "@/components/reports/MonthCalendarGrid";
import type { WeeklyGoal } from "@/types/database";

function parseMonth(param?: string | null) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface ReportsData {
  summary: MonthlySummary;
  treatmentStats: TreatmentStat[];
  nailsFacialsTrend: NailsFacialsTrendPoint[];
  dailyBreakdown: DailyBreakdown[];
  currentPeriod: PeriodStats;
  previousPeriod: PeriodStats;
  paymentBreakdown: PaymentMethodBreakdown[];
  transactions: Transaction[];
  goals: WeeklyGoal[];
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsFallback />}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsFallback() {
  return (
    <div className="px-4">
      <Header title="דוחות 📊" />
      <p className="mt-8 text-center text-sm text-text-muted">טוענת נתונים…</p>
    </div>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const monthStart = parseMonth(searchParams.get("month"));
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const kind = searchParams.get("kind") ?? "all";

  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    const monthStarts12 = Array.from({ length: 12 }, (_, i) => {
      return new Date(monthStart.getFullYear(), monthStart.getMonth() - 11 + i, 1);
    });
    const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);

    Promise.all([
      getMonthlySummary(supabase, monthStart, monthEnd),
      getIncomePerHourByTreatment(supabase, monthStart, monthEnd),
      getNailsFacialsTrend(supabase, monthStarts12),
      getDailyBreakdown(supabase, monthStart, monthEnd),
      getPeriodStats(supabase, monthStart, monthEnd),
      getPeriodStats(supabase, prevMonth, monthStart),
      getPaymentMethodBreakdown(supabase, monthStart, monthEnd),
      getTransactions(supabase, monthStart, monthEnd),
      supabase
        .from("weekly_goals")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(10)
        .returns<WeeklyGoal[]>(),
    ]).then(
      ([
        summary,
        treatmentStats,
        nailsFacialsTrend,
        dailyBreakdown,
        currentPeriod,
        previousPeriod,
        paymentBreakdown,
        transactions,
        { data: goals },
      ]) => {
        setData({
          summary,
          treatmentStats,
          nailsFacialsTrend,
          dailyBreakdown,
          currentPeriod,
          previousPeriod,
          paymentBreakdown,
          transactions,
          goals: goals ?? [],
        });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStart.getTime(), monthEnd.getTime()]);

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const prevYear = new Date(monthStart.getFullYear() - 1, monthStart.getMonth(), 1);
  const nextYear = new Date(monthStart.getFullYear() + 1, monthStart.getMonth(), 1);

  return (
    <div className="px-4">
      <Header title="דוחות 📊" />

      <div className="flex items-center justify-between pt-3">
        <Link
          href={`/reports?month=${monthParam(prevYear)}`}
          className="p-2 text-text-muted"
          aria-label="שנה קודמת"
        >
          <ChevronsRight size={18} />
        </Link>
        <Link
          href={`/reports?month=${monthParam(prevMonth)}`}
          className="p-2 text-text-muted"
          aria-label="חודש קודם"
        >
          <ChevronRight size={20} />
        </Link>
        <p className="font-heading text-lg">
          {monthStart.toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
        </p>
        <Link
          href={`/reports?month=${monthParam(nextMonth)}`}
          className="p-2 text-text-muted"
          aria-label="חודש הבא"
        >
          <ChevronLeft size={20} />
        </Link>
        <Link
          href={`/reports?month=${monthParam(nextYear)}`}
          className="p-2 text-text-muted"
          aria-label="שנה הבאה"
        >
          <ChevronsLeft size={18} />
        </Link>
      </div>

      {!data ? (
        <p className="mt-8 text-center text-sm text-text-muted">טוענת נתונים…</p>
      ) : (
        <ReportsBody data={data} kind={kind} monthStart={monthStart} />
      )}
    </div>
  );
}

function ReportsBody({
  data,
  kind,
  monthStart,
}: {
  data: ReportsData;
  kind: string;
  monthStart: Date;
}) {
  const {
    summary,
    treatmentStats,
    nailsFacialsTrend,
    dailyBreakdown,
    currentPeriod,
    previousPeriod,
    paymentBreakdown,
    transactions,
    goals,
  } = data;

  const paymentTotal = paymentBreakdown.reduce((s, p) => s + p.amount, 0);
  const filteredTransactions =
    kind === "all" ? transactions : transactions.filter((t) => t.kind === kind);

  return (
    <>
      <Card className="mt-4">
        <CardTitle>💰 סיכום חודשי (שולם בפועל)</CardTitle>
        <div className="space-y-1.5 text-sm">
          <Row label="הכנסה מטיפולים" value={formatCurrency(summary.treatmentIncome)} />
          <Row label="הכנסה ממכירת מוצרים" value={formatCurrency(summary.productIncome)} />
          <Row label="סה&quot;כ הכנסות" value={formatCurrency(summary.totalIncome)} strong />
          <Row label="הוצאות" value={formatCurrency(summary.totalExpenses)} />
          <div className="border-t border-border-soft mt-2 pt-2">
            <Row label="רווח נקי" value={formatCurrency(summary.profit)} strong accent />
          </div>
        </div>
      </Card>

      <Card className="mt-3">
        <CardTitle>💳 פילוח לפי אמצעי תשלום (החודש)</CardTitle>
        {paymentTotal === 0 ? (
          <p className="text-sm text-text-muted">אין נתונים החודש</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            {paymentBreakdown.map((p) => (
              <Row
                key={p.method}
                label={`${PAYMENT_METHOD_EMOJI[p.method]} ${PAYMENT_METHOD_LABELS[p.method]}`}
                value={formatCurrency(p.amount)}
              />
            ))}
            <div className="border-t border-border-soft mt-2 pt-2">
              <Row label="סה&quot;כ" value={formatCurrency(paymentTotal)} strong accent />
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-3">
        <CardTitle>
          📅 הכנסה יומית — ציפורניים מול טיפולי פנים ({monthStart.toLocaleDateString("he-IL", { month: "long" })})
        </CardTitle>
        <MonthCalendarGrid monthStart={monthStart} breakdown={dailyBreakdown} />
      </Card>

      <Card className="mt-3">
        <CardTitle>📈 התקדמות מהחודש הקודם</CardTitle>
        <div className="space-y-2.5">
          <ProgressRow
            label="✨ טיפולי פנים"
            current={currentPeriod.facialsCount}
            previous={previousPeriod.facialsCount}
            unit=""
            goodDirection="up"
          />
          <ProgressRow
            label="💅 ציפורניים"
            current={currentPeriod.nailsCount}
            previous={previousPeriod.nailsCount}
            unit=""
            goodDirection="down"
          />
          <ProgressRow
            label="💰 הכנסה"
            current={currentPeriod.income}
            previous={previousPeriod.income}
            unit="currency"
            goodDirection="up"
          />
        </div>
      </Card>

      <Card className="mt-3">
        <CardTitle>📊 פילוח לפי סוג טיפול (החודש)</CardTitle>
        {treatmentStats.length === 0 ? (
          <p className="text-sm text-text-muted">אין נתונים החודש</p>
        ) : (
          <div className="space-y-2">
            {treatmentStats.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <span className="truncate">{t.name}</span>
                <span className="text-text-muted">
                  {t.count}× · {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-3">
        <CardTitle>💅✨ ציפורניים מול טיפולי פנים — מגמה שנתית</CardTitle>
        <NailsFacialsChart data={nailsFacialsTrend} />
      </Card>

      <Card className="mt-3">
        <CardTitle>🎯 היסטוריית יעדים שבועיים</CardTitle>
        {goals.length === 0 ? (
          <p className="text-sm text-text-muted">אין עדיין יעדים שמורים</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{formatDate(g.week_start)}</span>
                <span>
                  יעד: {g.target_count} · {formatCurrency(g.target_revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-3 mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text">📋 כל התנועות</p>
          <div className="flex gap-1.5">
            {[
              { value: "all", label: "הכל" },
              { value: "treatment", label: "טיפולים" },
              { value: "product", label: "מוצרים" },
              { value: "expense", label: "הוצאות" },
            ].map((f) => (
              <Link
                key={f.value}
                href={`/reports?month=${monthParam(monthStart)}&kind=${f.value}`}
                className={cn(
                  "rounded-full px-2.5 py-1 text-sm font-medium",
                  kind === f.value
                    ? "gradient-primary text-accent-foreground shadow-sm shadow-accent/25"
                    : "bg-surface-soft text-text-muted",
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">אין תנועות</p>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((t) => (
              <div key={`${t.kind}-${t.id}`} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate">{t.label}</p>
                  <p className="truncate text-sm text-text-muted">
                    {formatDate(t.date)}
                    {t.subLabel ? ` · ${t.subLabel}` : ""}
                    {t.isPaid === false ? " · ממתין לתשלום" : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-bold",
                    t.amount < 0 ? "text-warning" : "text-success",
                  )}
                >
                  {formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span
        className={cn(
          strong && "font-semibold",
          accent && "text-accent-strong text-lg font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProgressRow({
  label,
  current,
  previous,
  unit,
  goodDirection,
}: {
  label: string;
  current: number;
  previous: number;
  unit: "" | "currency";
  goodDirection: "up" | "down";
}) {
  const pct =
    previous === 0
      ? current > 0
        ? 100
        : 0
      : Math.round(((current - previous) / previous) * 100);
  const improved = goodDirection === "up" ? pct > 0 : pct < 0;
  const worsened = goodDirection === "up" ? pct < 0 : pct > 0;
  const formatValue = (v: number) => (unit === "currency" ? formatCurrency(v) : String(v));

  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-text-muted">{formatValue(current)}</span>
        {pct !== 0 ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-sm font-semibold",
              improved ? "bg-success-bg text-success" : worsened ? "bg-warning-bg text-warning" : "",
            )}
          >
            {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
          </span>
        ) : (
          <span className="text-sm text-text-muted">ללא שינוי</span>
        )}
      </div>
    </div>
  );
}
