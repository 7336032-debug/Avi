-- Track payment method on product sales too, so daily/monthly income can
-- be broken down by payment method (cash/card/bit/transfer) across both
-- treatments and product sales — needed for end-of-day cash reconciliation.

alter table public.product_sales
  add column if not exists payment_method text not null default 'cash'
  check (payment_method in ('cash', 'card', 'bit', 'transfer'));
