// Shared `Row`/`Store` types plus a throwaway in-memory fallback store,
// used as `LocalQueryBuilder`'s default `StoreAccessor` (see
// queryBuilder.ts) when no explicit accessor is supplied. The app itself
// always passes the real accessor from browserStore.ts (persisted to
// localStorage) via browserClient.ts — this in-memory version only exists
// for backward compat / non-browser callers. Lives on `globalThis` so it
// survives Next.js dev-server hot reloads of this module, but resets on a
// full server restart — by design, not persistent storage.

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
export const LOCAL_USER_EMAIL = "demo@kerenamar.local";

export type Row = Record<string, unknown>;

export interface Store {
  treatments: Row[];
  treatment_log: Row[];
  product_sales: Row[];
  expense_categories: Row[];
  expenses: Row[];
  weekly_goals: Row[];
}

declare global {
  var __kaLocalStore: Store | undefined;
}

function uuid() {
  return crypto.randomUUID();
}

function atTime(daysFromToday: number, hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function isoDateOnly(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Sunday-based week start, matching lib/dates.ts weekStart().
function daysSinceSunday(): number {
  return new Date().getDay(); // 0 = Sunday
}

function buildSeed(): Store {
  const now = new Date();

  // ---- treatments -----------------------------------------------------
  const t = {
    lacquer: uuid(),
    acrylic: uuid(),
    deepClean: uuid(),
    phototherapy: uuid(),
    brightening: uuid(),
    meso: uuid(),
    electro: uuid(),
    rfExternal: uuid(),
    rfFace: uuid(),
    rfBody: uuid(),
    rfNeck: uuid(),
    rfNeckFace: uuid(),
    scarRemoval: uuid(),
  };

  const treatments: Row[] = [
    { id: t.lacquer, user_id: LOCAL_USER_ID, category: "ציפורניים", name: "מריחת לק", description: null, price: 150, price_note: null, duration_minutes: 45, is_series: false, series_size: null, series_price: null, sort_order: 1, created_at: now.toISOString() },
    { id: t.acrylic, user_id: LOCAL_USER_ID, category: "ציפורניים", name: "בניית ציפורניים באקריל + לק", description: null, price: 300, price_note: null, duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 2, created_at: now.toISOString() },

    { id: t.deepClean, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "ניקוי עמוק", description: "אבחון עור, פילינג, ניקוז, לחויות במכשור מתקדם, מסכות, פוטותרפיה", price: 400, price_note: null, duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 10, created_at: now.toISOString() },
    { id: t.phototherapy, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "פוטותרפיה", description: "חיטוי, טיהור, אנטי-אייג'ינג, קולגן ואלסטין, הבהרה", price: 150, price_note: null, duration_minutes: 20, is_series: false, series_size: null, series_price: null, sort_order: 11, created_at: now.toISOString() },
    { id: t.brightening, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "טיפול הבהרה", description: "פילינג + מכשור מתקדם", price: 400, price_note: null, duration_minutes: 60, is_series: true, series_size: 4, series_price: 1400, sort_order: 12, created_at: now.toISOString() },
    { id: t.meso, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "מזותרפיה", description: "פציעה מבוקרת, מעודד התחדשות עור - בסדרה בלבד", price: 500, price_note: null, duration_minutes: 50, is_series: true, series_size: 5, series_price: 2000, sort_order: 13, created_at: now.toISOString() },
    { id: t.electro, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "אלקטרופורציה", description: "החדרת חומרים פעילים, השלמה לזוהר", price: null, price_note: "400-600 ₪", duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 14, created_at: now.toISOString() },
    { id: t.rfExternal, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF חיצוני", description: "קולגן, אלסטין, מיצוק", price: 600, price_note: null, duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 15, created_at: now.toISOString() },
    { id: t.rfFace, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF פנים", description: null, price: null, price_note: "700-900 ₪", duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 16, created_at: now.toISOString() },
    { id: t.rfBody, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF גוף", description: null, price: null, price_note: "800-1500 ₪", duration_minutes: 75, is_series: false, series_size: null, series_price: null, sort_order: 17, created_at: now.toISOString() },
    { id: t.rfNeck, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF צוואר", description: null, price: 800, price_note: null, duration_minutes: 50, is_series: false, series_size: null, series_price: null, sort_order: 18, created_at: now.toISOString() },
    { id: t.rfNeckFace, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "RF צוואר ופנים", description: null, price: 1000, price_note: null, duration_minutes: 75, is_series: false, series_size: null, series_price: null, sort_order: 19, created_at: now.toISOString() },
    { id: t.scarRemoval, user_id: LOCAL_USER_ID, category: "טיפולי פנים", name: "הסרת סרחי עור", description: null, price: null, price_note: "לפי הערכה בייעוץ", duration_minutes: 60, is_series: false, series_size: null, series_price: null, sort_order: 20, created_at: now.toISOString() },
  ];

  // ---- treatment_log (already-performed treatments, no scheduling) ------
  const treatmentLog: Row[] = [];

  function addLog(opts: {
    daysFromToday: number;
    hour: number;
    treatmentId: string;
    price: number;
    duration: number;
    isPaid?: boolean;
  }): string {
    const id = uuid();
    const treatment = treatments.find((tr) => tr.id === opts.treatmentId)!;
    treatmentLog.push({
      id,
      user_id: LOCAL_USER_ID,
      treatment_id: opts.treatmentId,
      treatment_name: treatment.name,
      amount: opts.price,
      duration_minutes: opts.duration,
      payment_method: ["cash", "card", "bit", "transfer"][Math.floor(Math.random() * 4)],
      is_paid: opts.isPaid ?? true,
      performed_at: atTime(opts.daysFromToday, opts.hour),
      notes: null,
      created_at: now.toISOString(),
    });
    return id;
  }

  // Past 3 weeks: a realistic mix of nails/facials.
  addLog({ daysFromToday: -21, hour: 10, treatmentId: t.acrylic, price: 300, duration: 60 });
  addLog({ daysFromToday: -20, hour: 12, treatmentId: t.deepClean, price: 400, duration: 60 });
  addLog({ daysFromToday: -19, hour: 9, treatmentId: t.lacquer, price: 150, duration: 45 });
  addLog({ daysFromToday: -18, hour: 15, treatmentId: t.rfExternal, price: 600, duration: 60, isPaid: false });
  addLog({ daysFromToday: -17, hour: 11, treatmentId: t.brightening, price: 400, duration: 60 });
  addLog({ daysFromToday: -13, hour: 10, treatmentId: t.acrylic, price: 300, duration: 60 });
  addLog({ daysFromToday: -12, hour: 13, treatmentId: t.phototherapy, price: 150, duration: 20 });
  addLog({ daysFromToday: -11, hour: 16, treatmentId: t.meso, price: 500, duration: 50 });
  addLog({ daysFromToday: -10, hour: 9, treatmentId: t.acrylic, price: 300, duration: 60, isPaid: false });
  addLog({ daysFromToday: -9, hour: 12, treatmentId: t.lacquer, price: 150, duration: 45 });
  addLog({ daysFromToday: -8, hour: 14, treatmentId: t.deepClean, price: 400, duration: 60 });
  addLog({ daysFromToday: -6, hour: 11, treatmentId: t.lacquer, price: 150, duration: 45 });
  addLog({ daysFromToday: -5, hour: 13, treatmentId: t.rfFace, price: 800, duration: 60 });

  // This week — mix of nails/facials logged so far, weighted toward
  // facials to demonstrate the "growing facials" goal in a good state.
  const todayOffset = -daysSinceSunday(); // start of this week (Sunday)
  addLog({ daysFromToday: todayOffset + 1, hour: 10, treatmentId: t.deepClean, price: 400, duration: 60 });
  addLog({ daysFromToday: todayOffset + 2, hour: 11, treatmentId: t.acrylic, price: 300, duration: 60 });
  addLog({ daysFromToday: todayOffset + 2, hour: 15, treatmentId: t.rfNeck, price: 800, duration: 50 });
  addLog({
    daysFromToday: 0,
    hour: Math.max(new Date().getHours() - 3, 8),
    treatmentId: t.lacquer,
    price: 150,
    duration: 45,
    isPaid: false,
  });
  addLog({
    daysFromToday: 0,
    hour: Math.max(new Date().getHours() - 1, 8),
    treatmentId: t.phototherapy,
    price: 150,
    duration: 20,
  });

  // ---- product sales ------------------------------------------------------
  const productSales: Row[] = [
    { id: uuid(), user_id: LOCAL_USER_ID, treatment_log_id: null, product_name: "קרם לחות פנים", amount: 120, payment_method: "card", is_paid: true, notes: null, sold_at: atTime(-9, 12), created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, treatment_log_id: null, product_name: "סרום ויטמין C", amount: 180, payment_method: "cash", is_paid: false, notes: null, sold_at: atTime(-4, 10), created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, treatment_log_id: null, product_name: "שמן לחיפוי ציפורניים", amount: 60, payment_method: "bit", is_paid: true, notes: null, sold_at: atTime(-2, 16), created_at: now.toISOString() },
  ];

  // ---- expense categories + expenses ---------------------------------------
  const ec = {
    materials: uuid(),
    equipment: uuid(),
    rent: uuid(),
    marketing: uuid(),
    other: uuid(),
  };
  const expenseCategories: Row[] = [
    { id: ec.materials, user_id: LOCAL_USER_ID, name: "חומרי גלם", default_amount: null, sort_order: 1, created_at: now.toISOString() },
    { id: ec.equipment, user_id: LOCAL_USER_ID, name: "ציוד", default_amount: null, sort_order: 2, created_at: now.toISOString() },
    { id: ec.rent, user_id: LOCAL_USER_ID, name: "שכירות", default_amount: 2500, sort_order: 3, created_at: now.toISOString() },
    { id: ec.marketing, user_id: LOCAL_USER_ID, name: "שיווק", default_amount: null, sort_order: 4, created_at: now.toISOString() },
    { id: ec.other, user_id: LOCAL_USER_ID, name: "אחר", default_amount: null, sort_order: 5, created_at: now.toISOString() },
  ];

  const expenses: Row[] = [
    { id: uuid(), user_id: LOCAL_USER_ID, category_id: ec.rent, description: "שכירות חודשית", amount: 2500, notes: null, spent_at: atTime(-15, 9), created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, category_id: ec.materials, description: "מלאי חומרי גלם לטיפולי פנים", amount: 650, notes: null, spent_at: atTime(-12, 9), created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, category_id: ec.marketing, description: "קידום ברשתות חברתיות", amount: 200, notes: null, spent_at: atTime(-8, 9), created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, category_id: ec.equipment, description: "מכשיר RF - תחזוקה", amount: 350, notes: null, spent_at: atTime(-6, 9), created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, category_id: ec.materials, description: "לקים וחומרי גימור לציפורניים", amount: 300, notes: null, spent_at: atTime(-2, 9), created_at: now.toISOString() },
  ];

  // ---- weekly goals ---------------------------------------------------------
  const weeklyGoals: Row[] = [
    { id: uuid(), user_id: LOCAL_USER_ID, week_start: isoDateOnly(todayOffset - 14), target_count: 5, target_revenue: 2000, created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, week_start: isoDateOnly(todayOffset - 7), target_count: 6, target_revenue: 2200, created_at: now.toISOString() },
    { id: uuid(), user_id: LOCAL_USER_ID, week_start: isoDateOnly(todayOffset), target_count: 7, target_revenue: 2400, created_at: now.toISOString() },
  ];

  return {
    treatments,
    treatment_log: treatmentLog,
    product_sales: productSales,
    expense_categories: expenseCategories,
    expenses,
    weekly_goals: weeklyGoals,
  };
}

export function getStore(): Store {
  if (!globalThis.__kaLocalStore) {
    globalThis.__kaLocalStore = buildSeed();
  }
  return globalThis.__kaLocalStore;
}

export function resetStore(): Store {
  globalThis.__kaLocalStore = buildSeed();
  return globalThis.__kaLocalStore;
}
