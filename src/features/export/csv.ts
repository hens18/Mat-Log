// CSV export for weigh-ins, practices, and food. Pure functions.

import type { FoodLog } from '@/features/nutrition/summary';
import type { Practice, WeighIn, WeightUnit } from '@/types/models';

type Cell = string | number | null | undefined;

/** One CSV field, quoted when it contains a comma, quote, or line break. */
export function csvCell(value: Cell): string {
  if (value == null) return '';
  const text = String(value);
  // Spreadsheet apps run cells starting with these as formulas; prefix them so they stay text.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value !== 'number' ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const KIND_LABELS: Record<WeighIn['kind'], string> = {
  morning: 'Morning',
  pre_practice: 'Pre-practice',
  post_practice: 'Post-practice',
  night: 'Night',
};

/** Local date and time as "2026-10-13 07:05", which every spreadsheet reads. */
function localDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function weighInsCsv(weighIns: readonly WeighIn[], unit: WeightUnit): string {
  return toCsv(
    ['Date', `Weight (${unit})`, 'Kind', 'Note'],
    [...weighIns]
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      .map((w) => [localDateTime(w.recorded_at), w.weight, KIND_LABELS[w.kind], w.note]),
  );
}

export function practicesCsv(practices: readonly Practice[], unit: WeightUnit): string {
  return toCsv(
    [
      'Date',
      'Duration (min)',
      'Intensity (1-5)',
      `Pre weight (${unit})`,
      `Post weight (${unit})`,
      `Weight lost (${unit})`,
      'Fluid during (ml)',
      'Notes',
    ],
    [...practices]
      .sort((a, b) => a.practice_date.localeCompare(b.practice_date))
      .map((p) => [
        p.practice_date,
        p.duration_minutes,
        p.intensity,
        p.pre_weight,
        p.post_weight,
        p.weight_lost,
        p.fluid_during_ml,
        p.notes,
      ]),
  );
}

export function foodCsv(entries: readonly FoodLog[]): string {
  return toCsv(
    [
      'Date',
      'Meal',
      'Food',
      'Brand',
      'Servings',
      'Serving',
      'Calories',
      'Protein (g)',
      'Carbs (g)',
      'Fat (g)',
    ],
    [...entries]
      .sort(
        (a, b) =>
          a.logged_on.localeCompare(b.logged_on) || a.created_at.localeCompare(b.created_at),
      )
      .map((e) => [
        e.logged_on,
        e.meal,
        e.name,
        e.brand,
        e.servings,
        e.serving_label,
        e.calories,
        e.protein_g,
        e.carbs_g,
        e.fat_g,
      ]),
  );
}
