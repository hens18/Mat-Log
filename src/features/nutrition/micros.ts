// Micronutrients tracked per food, with FDA Daily Values for adults and
// children 4 and older (21 CFR 101.9). Amounts are always stored in the unit
// listed here, so values from different sources can be added together.

import type { Json } from '@/types/database';

export type MicroKey =
  | 'fiber'
  | 'sugar'
  | 'saturatedFat'
  | 'cholesterol'
  | 'sodium'
  | 'potassium'
  | 'calcium'
  | 'iron'
  | 'magnesium'
  | 'zinc'
  | 'vitaminA'
  | 'vitaminC'
  | 'vitaminD'
  | 'vitaminB12';

export type Micros = Partial<Record<MicroKey, number>>;

export type MicroDefinition = {
  key: MicroKey;
  label: string;
  unit: 'g' | 'mg' | 'µg';
  /** FDA Daily Value; null when there isn't one (total sugars). */
  dailyValue: number | null;
  /** 'limit' nutrients are ones to keep under the Daily Value. */
  goal: 'limit' | 'target';
  /** USDA FoodData Central nutrient ids, in order of preference, with a factor to our unit. */
  usda: { id: number; factor: number }[];
  /** Open Food Facts nutriment key. Its _100g values are in grams. */
  off: string;
};

export const MICRONUTRIENTS: readonly MicroDefinition[] = [
  // Worth watching, especially sodium during a weight cut.
  {
    key: 'sodium',
    label: 'Sodium',
    unit: 'mg',
    dailyValue: 2300,
    goal: 'limit',
    usda: [{ id: 1093, factor: 1 }],
    off: 'sodium',
  },
  {
    key: 'sugar',
    label: 'Sugar',
    unit: 'g',
    dailyValue: null,
    goal: 'limit',
    usda: [
      { id: 2000, factor: 1 },
      { id: 1063, factor: 1 },
    ],
    off: 'sugars',
  },
  {
    key: 'saturatedFat',
    label: 'Saturated fat',
    unit: 'g',
    dailyValue: 20,
    goal: 'limit',
    usda: [{ id: 1258, factor: 1 }],
    off: 'saturated-fat',
  },
  {
    key: 'cholesterol',
    label: 'Cholesterol',
    unit: 'mg',
    dailyValue: 300,
    goal: 'limit',
    usda: [{ id: 1253, factor: 1 }],
    off: 'cholesterol',
  },
  // Worth getting enough of.
  {
    key: 'fiber',
    label: 'Fiber',
    unit: 'g',
    dailyValue: 28,
    goal: 'target',
    usda: [{ id: 1079, factor: 1 }],
    off: 'fiber',
  },
  {
    key: 'potassium',
    label: 'Potassium',
    unit: 'mg',
    dailyValue: 4700,
    goal: 'target',
    usda: [{ id: 1092, factor: 1 }],
    off: 'potassium',
  },
  {
    key: 'calcium',
    label: 'Calcium',
    unit: 'mg',
    dailyValue: 1300,
    goal: 'target',
    usda: [{ id: 1087, factor: 1 }],
    off: 'calcium',
  },
  {
    key: 'iron',
    label: 'Iron',
    unit: 'mg',
    dailyValue: 18,
    goal: 'target',
    usda: [{ id: 1089, factor: 1 }],
    off: 'iron',
  },
  {
    key: 'magnesium',
    label: 'Magnesium',
    unit: 'mg',
    dailyValue: 420,
    goal: 'target',
    usda: [{ id: 1090, factor: 1 }],
    off: 'magnesium',
  },
  {
    key: 'zinc',
    label: 'Zinc',
    unit: 'mg',
    dailyValue: 11,
    goal: 'target',
    usda: [{ id: 1095, factor: 1 }],
    off: 'zinc',
  },
  // Vitamin A in IU can't be converted to µg RAE without knowing its source, so only RAE is used.
  {
    key: 'vitaminA',
    label: 'Vitamin A',
    unit: 'µg',
    dailyValue: 900,
    goal: 'target',
    usda: [{ id: 1106, factor: 1 }],
    off: 'vitamin-a',
  },
  {
    key: 'vitaminC',
    label: 'Vitamin C',
    unit: 'mg',
    dailyValue: 90,
    goal: 'target',
    usda: [{ id: 1162, factor: 1 }],
    off: 'vitamin-c',
  },
  // 1 IU of vitamin D is exactly 0.025 µg.
  {
    key: 'vitaminD',
    label: 'Vitamin D',
    unit: 'µg',
    dailyValue: 20,
    goal: 'target',
    usda: [
      { id: 1114, factor: 1 },
      { id: 1110, factor: 0.025 },
    ],
    off: 'vitamin-d',
  },
  {
    key: 'vitaminB12',
    label: 'Vitamin B12',
    unit: 'µg',
    dailyValue: 2.4,
    goal: 'target',
    usda: [{ id: 1178, factor: 1 }],
    off: 'vitamin-b12',
  },
];

const GRAMS_TO_UNIT = { g: 1, mg: 1000, µg: 1_000_000 } as const;

/** Rounds to a precision that suits the size of the number. */
export function roundAmount(value: number): number {
  const places = value >= 100 ? 0 : value >= 1 ? 1 : 2;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Micronutrients per 100 g from a USDA food's nutrient values (keyed by nutrient id). */
export function microsFromUsda(values: ReadonlyMap<number, number>): Micros {
  const micros: Micros = {};
  for (const def of MICRONUTRIENTS) {
    const match = def.usda.find(({ id }) => values.has(id));
    if (match) micros[def.key] = values.get(match.id)! * match.factor;
  }
  return micros;
}

/** Micronutrients per 100 g from Open Food Facts nutriments, converting from grams. */
export function microsFromOpenFoodFacts(
  nutriments: Record<string, number | string | undefined>,
  servingGrams: number | null,
): Micros {
  const micros: Micros = {};
  for (const def of MICRONUTRIENTS) {
    const per100 = toNumber(nutriments[`${def.off}_100g`]);
    const perServing = toNumber(nutriments[`${def.off}_serving`]);
    const grams =
      per100 ?? (perServing != null && servingGrams ? (perServing * 100) / servingGrams : null);
    if (grams != null) micros[def.key] = grams * GRAMS_TO_UNIT[def.unit];
  }
  return micros;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export function scaleMicros(micros: Micros, factor: number): Micros {
  const scaled: Micros = {};
  for (const def of MICRONUTRIENTS) {
    const value = micros[def.key];
    if (value != null) scaled[def.key] = roundAmount(value * factor);
  }
  return scaled;
}

/** Reads the jsonb column back, keeping only known keys with numeric values. */
export function parseMicros(value: Json | null | undefined): Micros | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const micros: Micros = {};
  for (const def of MICRONUTRIENTS) {
    const amount = (value as Record<string, Json | undefined>)[def.key];
    if (typeof amount === 'number' && Number.isFinite(amount)) micros[def.key] = amount;
  }
  return Object.keys(micros).length ? micros : null;
}

export type MicroTotals = {
  totals: Micros;
  /** How many entries contributed any micronutrient data. */
  entriesWithData: number;
  totalEntries: number;
};

/** Adds up micronutrients across a day's entries. Keys missing everywhere stay missing. */
export function sumMicros(entries: readonly { micros: Json | null }[]): MicroTotals {
  const totals: Micros = {};
  let entriesWithData = 0;
  for (const entry of entries) {
    const micros = parseMicros(entry.micros);
    if (!micros) continue;
    entriesWithData += 1;
    for (const def of MICRONUTRIENTS) {
      const value = micros[def.key];
      if (value != null) totals[def.key] = (totals[def.key] ?? 0) + value;
    }
  }
  for (const def of MICRONUTRIENTS) {
    if (totals[def.key] != null) totals[def.key] = roundAmount(totals[def.key]!);
  }
  return { totals, entriesWithData, totalEntries: entries.length };
}

/** Percent of the Daily Value, or null when the nutrient has none. */
export function percentDailyValue(def: MicroDefinition, amount: number): number | null {
  return def.dailyValue ? Math.round((amount / def.dailyValue) * 100) : null;
}

export function formatMicro(def: MicroDefinition, amount: number): string {
  return `${roundAmount(amount).toLocaleString()} ${def.unit}`;
}
