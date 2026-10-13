-- Micronutrients for each logged food, as totals for the whole entry, e.g.
-- {"sodium": 433.2, "fiber": 3.1, "vitaminD": 2.5}. Keys follow
-- src/features/nutrition/micros.ts; units are fixed per key (g, mg, or ug).
-- Missing keys mean the source had no data, which is different from zero.
-- Quick-add entries leave this null.

alter table public.food_logs
  add column micros jsonb check (micros is null or jsonb_typeof(micros) = 'object');

comment on column public.food_logs.micros is
  'Micronutrient totals for the entry, keyed by nutrient. Null when unknown.';
