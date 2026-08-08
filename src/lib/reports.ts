import type { createBrowserClient } from "@/lib/local/browserClient";
import { NAILS_CATEGORY, FACIALS_CATEGORY } from "@/types/database";

// Duck-typed client shape (same `.from(table)...` chain the browser client
// speaks) — kept generic here rather than importing @supabase/supabase-js,
// which this app no longer depends on now that Supabase has been removed.
type SupabaseClient = ReturnType<typeof createBrowserClient>;
import type { PaymentMethod } from "@/types/database";
import { isoDate } from "@/lib/dates";

type Cat = { category: string } | { category: string }[] | null;

function firstCategory(c: Cat): string | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0]?.category ?? null) : c.category;
}

export interface MonthlySummary {
  treatmentIncome: number;
  productIncome: number;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
}

export async function getMonthlySummary(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<MonthlySummary> {
  const [{ data: logs }, { data: sales }, { data: expenses }] = await Promise.all([
    supabase
      .from("treatment_log")
      .select("amount")
      .eq("is_paid", true)
      .gte("performed_at", start.toISOString())
      .lt("performed_at", end.toISOString()),
    supabase
      .from("product_sales")
      .select("amount")
      .eq("is_paid", true)
      .gte("sold_at", start.toISOString())
      .lt("sold_at", end.toISOString()),
    supabase
      .from("expenses")
      .select("amount")
      .gte("spent_at", start.toISOString())
      .lt("spent_at", end.toISOString()),
  ]);

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const treatmentIncome = sum(logs);
  const productIncome = sum(sales);
  const totalExpenses = sum(expenses);
  const totalIncome = treatmentIncome + productIncome;

  return {
    treatmentIncome,
    productIncome,
    totalIncome,
    totalExpenses,
    profit: totalIncome - totalExpenses,
  };
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  amount: number;
}

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "bit", "transfer"];

export async function getPaymentMethodBreakdown(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<PaymentMethodBreakdown[]> {
  const [{ data: logs }, { data: sales }] = await Promise.all([
    supabase
      .from("treatment_log")
      .select("amount, payment_method")
      .eq("is_paid", true)
      .gte("performed_at", start.toISOString())
      .lt("performed_at", end.toISOString()),
    supabase
      .from("product_sales")
      .select("amount, payment_method")
      .eq("is_paid", true)
      .gte("sold_at", start.toISOString())
      .lt("sold_at", end.toISOString()),
  ]);

  const totals: Record<PaymentMethod, number> = { cash: 0, card: 0, bit: 0, transfer: 0 };
  for (const row of logs ?? []) {
    totals[row.payment_method as PaymentMethod] += Number(row.amount);
  }
  for (const row of sales ?? []) {
    totals[row.payment_method as PaymentMethod] += Number(row.amount);
  }

  return PAYMENT_METHODS.map((method) => ({ method, amount: totals[method] }));
}

export interface CategoryStat {
  category: string;
  amount: number;
  minutes: number;
  perHour: number;
}

export async function getIncomePerHourByCategory(
  supabase: SupabaseClient,
  start?: Date,
  end?: Date,
): Promise<CategoryStat[]> {
  let query = supabase
    .from("treatment_log")
    .select("amount, duration_minutes, treatment:treatments(category)")
    .eq("is_paid", true);
  if (start) query = query.gte("performed_at", start.toISOString());
  if (end) query = query.lt("performed_at", end.toISOString());
  const { data } = await query;

  const map = new Map<string, { amount: number; minutes: number }>();
  for (const row of data ?? []) {
    const category = firstCategory(row.treatment) ?? "אחר";
    const entry = map.get(category) ?? { amount: 0, minutes: 0 };
    entry.amount += Number(row.amount);
    entry.minutes += Number(row.duration_minutes);
    map.set(category, entry);
  }

  return Array.from(map.entries())
    .map(([category, { amount, minutes }]) => ({
      category,
      amount,
      minutes,
      perHour: minutes > 0 ? amount / (minutes / 60) : 0,
    }))
    .sort((a, b) => b.perHour - a.perHour);
}

export interface TreatmentStat {
  name: string;
  amount: number;
  minutes: number;
  count: number;
  perHour: number;
}

export async function getIncomePerHourByTreatment(
  supabase: SupabaseClient,
  start?: Date,
  end?: Date,
): Promise<TreatmentStat[]> {
  let query = supabase
    .from("treatment_log")
    .select("amount, duration_minutes, treatment_name")
    .eq("is_paid", true);
  if (start) query = query.gte("performed_at", start.toISOString());
  if (end) query = query.lt("performed_at", end.toISOString());
  const { data } = await query;

  const map = new Map<string, { amount: number; minutes: number; count: number }>();
  for (const row of data ?? []) {
    const name = row.treatment_name;
    const entry = map.get(name) ?? { amount: 0, minutes: 0, count: 0 };
    entry.amount += Number(row.amount);
    entry.minutes += Number(row.duration_minutes);
    entry.count += 1;
    map.set(name, entry);
  }

  return Array.from(map.entries())
    .map(([name, { amount, minutes, count }]) => ({
      name,
      amount,
      minutes,
      count,
      perHour: minutes > 0 ? amount / (minutes / 60) : 0,
    }))
    .sort((a, b) => b.perHour - a.perHour);
}

export interface CategoryCounts {
  nailsCount: number;
  facialsCount: number;
}

export async function getCategoryCounts(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<CategoryCounts> {
  const { data: logs } = await supabase
    .from("treatment_log")
    .select("treatment:treatments(category)")
    .gte("performed_at", start.toISOString())
    .lt("performed_at", end.toISOString());

  let nailsCount = 0;
  let facialsCount = 0;
  for (const row of logs ?? []) {
    const category = firstCategory(row.treatment);
    if (category === NAILS_CATEGORY) nailsCount += 1;
    else if (category === FACIALS_CATEGORY) facialsCount += 1;
  }

  return { nailsCount, facialsCount };
}

export interface FacialsProgress {
  completedCount: number;
  completedRevenue: number;
}

export async function getFacialsWeekProgress(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<FacialsProgress> {
  const { data: logs } = await supabase
    .from("treatment_log")
    .select("amount, treatment:treatments(category)")
    .gte("performed_at", start.toISOString())
    .lt("performed_at", end.toISOString());

  const facialsLogs = (logs ?? []).filter(
    (l) => firstCategory(l.treatment) === FACIALS_CATEGORY,
  );

  return {
    completedCount: facialsLogs.length,
    completedRevenue: facialsLogs.reduce((s, l) => s + Number(l.amount), 0),
  };
}

export interface FacialsWeekComparison {
  thisWeekCount: number;
  thisWeekRevenue: number;
  lastWeekCount: number;
  lastWeekRevenue: number;
  autoTargetCount: number;
  autoTargetRevenue: number;
}

export async function getFacialsWeekComparison(
  supabase: SupabaseClient,
  thisWeekStart: Date,
  thisWeekEnd: Date,
  lastWeekStart: Date,
  lastWeekEnd: Date,
): Promise<FacialsWeekComparison> {
  const [thisWeek, lastWeek] = await Promise.all([
    getFacialsWeekProgress(supabase, thisWeekStart, thisWeekEnd),
    getFacialsWeekProgress(supabase, lastWeekStart, lastWeekEnd),
  ]);

  return {
    thisWeekCount: thisWeek.completedCount,
    thisWeekRevenue: thisWeek.completedRevenue,
    lastWeekCount: lastWeek.completedCount,
    lastWeekRevenue: lastWeek.completedRevenue,
    autoTargetCount: Math.max(1, Math.ceil(lastWeek.completedCount * 1.1)),
    autoTargetRevenue: Math.max(1, Math.ceil(lastWeek.completedRevenue * 1.1)),
  };
}

export interface FacialsTreatmentUsage {
  id: string;
  name: string;
  count: number;
}

export async function getFacialsTreatmentUsage(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<FacialsTreatmentUsage[]> {
  const [{ data: treatments }, { data: logs }] = await Promise.all([
    supabase
      .from("treatments")
      .select("id, name, sort_order")
      .eq("category", FACIALS_CATEGORY)
      .order("sort_order"),
    supabase
      .from("treatment_log")
      .select("treatment_id")
      .gte("performed_at", start.toISOString())
      .lt("performed_at", end.toISOString()),
  ]);

  const counts = new Map<string, number>();
  for (const log of logs ?? []) {
    if (!log.treatment_id) continue;
    counts.set(log.treatment_id, (counts.get(log.treatment_id) ?? 0) + 1);
  }

  return (treatments ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    count: counts.get(t.id as string) ?? 0,
  }));
}

export interface DailyBreakdown {
  date: string;
  nailsCount: number;
  facialsCount: number;
  income: number;
}

export async function getDailyBreakdown(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<DailyBreakdown[]> {
  const { data: logs } = await supabase
    .from("treatment_log")
    .select("amount, performed_at, treatment:treatments(category)")
    .gte("performed_at", start.toISOString())
    .lt("performed_at", end.toISOString());

  const map = new Map<string, DailyBreakdown>();
  for (const row of logs ?? []) {
    const date = isoDate(new Date(row.performed_at as string));
    const entry = map.get(date) ?? { date, nailsCount: 0, facialsCount: 0, income: 0 };
    const category = firstCategory(row.treatment);
    if (category === NAILS_CATEGORY) entry.nailsCount += 1;
    else if (category === FACIALS_CATEGORY) entry.facialsCount += 1;
    entry.income += Number(row.amount);
    map.set(date, entry);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface PeriodStats {
  nailsCount: number;
  facialsCount: number;
  income: number;
}

export async function getPeriodStats(
  supabase: SupabaseClient,
  start: Date,
  end: Date,
): Promise<PeriodStats> {
  const [{ nailsCount, facialsCount }, summary] = await Promise.all([
    getCategoryCounts(supabase, start, end),
    getMonthlySummary(supabase, start, end),
  ]);
  return {
    nailsCount,
    facialsCount,
    income: summary.totalIncome,
  };
}

export interface NailsFacialsTrendPoint {
  label: string;
  nailsAmount: number;
  facialsAmount: number;
}

export async function getNailsFacialsTrend(
  supabase: SupabaseClient,
  monthStarts: Date[],
): Promise<NailsFacialsTrendPoint[]> {
  const points: NailsFacialsTrendPoint[] = [];
  for (let i = 0; i < monthStarts.length; i++) {
    const start = monthStarts[i];
    const end =
      i + 1 < monthStarts.length
        ? monthStarts[i + 1]
        : new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const stats = await getIncomePerHourByCategory(supabase, start, end);
    const nails = stats.find((s) => s.category === NAILS_CATEGORY);
    const facials = stats.find((s) => s.category === FACIALS_CATEGORY);
    points.push({
      label: start.toLocaleDateString("he-IL", { month: "short" }),
      nailsAmount: nails?.amount ?? 0,
      facialsAmount: facials?.amount ?? 0,
    });
  }
  return points;
}
