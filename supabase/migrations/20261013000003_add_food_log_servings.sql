-- Food database support: remember where a logged food came from and how
-- much was eaten. calories / protein_g / carbs_g / fat_g stay the totals for
-- the whole entry, so daily summaries don't need to know about servings.

create type public.food_source as enum ('custom', 'usda', 'open_food_facts');

alter table public.food_logs
  add column brand text check (char_length(brand) <= 120),
  add column servings numeric(6, 2) not null default 1 check (servings > 0 and servings <= 100),
  add column serving_label text check (char_length(serving_label) <= 80),
  add column source public.food_source not null default 'custom',
  add column source_id text check (char_length(source_id) <= 64);

comment on column public.food_logs.servings is 'How many of serving_label were eaten.';
comment on column public.food_logs.source_id is 'USDA FDC id or barcode, for foods picked from a database.';
