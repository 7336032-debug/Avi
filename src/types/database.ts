export type PaymentMethod = "cash" | "card" | "bit" | "transfer";

export interface Treatment {
  id: string;
  user_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number | null;
  price_note: string | null;
  duration_minutes: number | null;
  is_series: boolean;
  series_size: number | null;
  series_price: number | null;
  sort_order: number;
  created_at: string;
}

export interface TreatmentLog {
  id: string;
  user_id: string;
  treatment_id: string | null;
  treatment_name: string;
  amount: number;
  duration_minutes: number;
  payment_method: PaymentMethod;
  is_paid: boolean;
  performed_at: string;
  notes: string | null;
  created_at: string;
}

export interface ProductSale {
  id: string;
  user_id: string;
  treatment_log_id: string | null;
  product_name: string;
  amount: number;
  payment_method: PaymentMethod;
  is_paid: boolean;
  notes: string | null;
  sold_at: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  default_amount: number | null;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string | null;
  amount: number;
  notes: string | null;
  spent_at: string;
  created_at: string;
}

export interface WeeklyGoal {
  id: string;
  user_id: string;
  week_start: string;
  target_count: number;
  target_revenue: number;
  created_at: string;
}

export const NAILS_CATEGORY = "ציפורניים";
export const FACIALS_CATEGORY = "טיפולי פנים";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "מזומן",
  card: "אשראי",
  bit: "ביט",
  transfer: "העברה בנקאית",
};
