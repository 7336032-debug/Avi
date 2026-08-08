-- Product pivot: remove the appointment-booking calendar and client
-- management entirely. The app now only logs treatments as they happen
-- (touch-first, no scheduling, no client tracking), to reflect the
-- nails-vs-facials balance and push growth of facial treatments.
-- Destructive by design — all appointment/client history is discarded.

drop table if exists public.appointments cascade;
drop table if exists public.clients cascade;
drop function if exists public.check_appointment_overlap();

alter table public.treatment_log drop column if exists appointment_id;
alter table public.treatment_log drop column if exists client_id;

alter table public.product_sales drop column if exists client_id;
