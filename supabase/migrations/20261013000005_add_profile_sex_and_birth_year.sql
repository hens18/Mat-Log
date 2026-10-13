-- Recommended intakes for vitamins and minerals depend on sex and age, so the
-- profile can optionally hold both. Without them the app falls back to the
-- general FDA Daily Values.

create type public.biological_sex as enum ('male', 'female');

alter table public.profiles
  add column sex public.biological_sex,
  add column birth_year smallint check (birth_year between 1900 and 2100);

comment on column public.profiles.sex is 'Used only to pick recommended nutrient intakes.';
comment on column public.profiles.birth_year is 'Used only to pick the age group for recommended nutrient intakes.';
