// Sweat loss and electrolyte replacement after practice. Pure functions.
//
// Sweat loss = weight lost during practice + fluid drunk during it (1 kg of
// body weight is about 1 L of sweat; urine is ignored). Electrolyte losses use
// average sweat concentrations from the American College of Sports Medicine
// position stand on exercise and fluid replacement: sodium about 35 mmol/L
// (range 10 to 70) and potassium about 5 mmol/L (range 3 to 15). Rehydration
// targets follow its advice to drink about 1.5 L for every kg lost.

import type { WeightUnit } from '@/types/models';

export const LB_PER_KG = 2.20462;
export const ML_PER_FL_OZ = 29.5735;

const SODIUM_MG_PER_MMOL = 22.99;
const POTASSIUM_MG_PER_MMOL = 39.1;

export const SWEAT_SODIUM = {
  typical: Math.round(35 * SODIUM_MG_PER_MMOL),
  low: Math.round(10 * SODIUM_MG_PER_MMOL),
  high: Math.round(70 * SODIUM_MG_PER_MMOL),
};
export const SWEAT_POTASSIUM = {
  typical: Math.round(5 * POTASSIUM_MG_PER_MMOL),
  low: Math.round(3 * POTASSIUM_MG_PER_MMOL),
  high: Math.round(15 * POTASSIUM_MG_PER_MMOL),
};

/** Drink this many liters per kg lost. */
export const REHYDRATION_FACTOR = 1.5;
/** Sweat losses above this share of body weight start to hurt performance. */
export const PERFORMANCE_LOSS_PERCENT = 2;

export type SweatInput = {
  preWeight: number | null;
  postWeight: number | null;
  unit: WeightUnit;
  fluidDuringMl: number | null;
  durationMinutes: number | null;
};

export type SweatEstimate = {
  weightLostKg: number;
  sweatMl: number;
  /** Per hour, when the duration is known. */
  sweatRateMlPerHour: number | null;
  /** Weight lost as a share of pre-practice weight. */
  percentBodyWeight: number;
  sodiumMg: { typical: number; low: number; high: number };
  potassiumMg: { typical: number; low: number; high: number };
  targets: { fluidMl: number; sodiumMg: number; potassiumMg: number };
};

const toKg = (weight: number, unit: WeightUnit) => (unit === 'kg' ? weight : weight / LB_PER_KG);

/** Null without both weights, or when there was no sweat loss to estimate. */
export function estimateSweat(input: SweatInput): SweatEstimate | null {
  const { preWeight, postWeight, unit, fluidDuringMl, durationMinutes } = input;
  if (preWeight == null || postWeight == null || preWeight <= 0) return null;
  const weightLostKg = toKg(preWeight - postWeight, unit);
  const sweatMl = Math.round(weightLostKg * 1000 + (fluidDuringMl ?? 0));
  if (sweatMl <= 0) return null;

  const liters = sweatMl / 1000;
  const scale = (perLiter: { typical: number; low: number; high: number }) => ({
    typical: Math.round(perLiter.typical * liters),
    low: Math.round(perLiter.low * liters),
    high: Math.round(perLiter.high * liters),
  });
  const sodiumMg = scale(SWEAT_SODIUM);
  const potassiumMg = scale(SWEAT_POTASSIUM);

  return {
    weightLostKg: Math.round(weightLostKg * 100) / 100,
    sweatMl,
    sweatRateMlPerHour: durationMinutes ? Math.round((sweatMl / durationMinutes) * 60) : null,
    percentBodyWeight: Math.round(((preWeight - postWeight) / preWeight) * 1000) / 10,
    sodiumMg,
    potassiumMg,
    targets: {
      // Only the weight still missing needs to come back; fluid drunk during practice already did.
      fluidMl: Math.max(0, Math.round(weightLostKg * 1000 * REHYDRATION_FACTOR)),
      sodiumMg: sodiumMg.typical,
      potassiumMg: potassiumMg.typical,
    },
  };
}

export type DrinkTotals = { volumeMl: number; sodiumMg: number; potassiumMg: number };

export function sumDrinks(
  drinks: readonly { volume_ml: number; sodium_mg: number; potassium_mg: number }[],
): DrinkTotals {
  return drinks.reduce(
    (total, d) => ({
      volumeMl: total.volumeMl + d.volume_ml,
      sodiumMg: total.sodiumMg + d.sodium_mg,
      potassiumMg: total.potassiumMg + d.potassium_mg,
    }),
    { volumeMl: 0, sodiumMg: 0, potassiumMg: 0 },
  );
}

/** Fluid in the unit that matches the user's weight unit: fl oz for lb, ml or L for kg. */
export function formatVolume(ml: number, unit: WeightUnit): string {
  if (unit === 'lb') return `${Math.round(ml / ML_PER_FL_OZ)} oz`;
  return ml >= 1000 ? `${Math.round(ml / 100) / 10} L` : `${Math.round(ml)} ml`;
}

/** Parses a typed volume in the user's unit (fl oz or ml) into ml. */
export function parseVolume(input: string, unit: WeightUnit): number | null | 'invalid' {
  const trimmed = input.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 'invalid';
  const ml = Math.round(unit === 'lb' ? Number(trimmed) * ML_PER_FL_OZ : Number(trimmed));
  return ml <= 5000 ? ml : 'invalid';
}

export function volumeInputText(ml: number | null, unit: WeightUnit): string {
  if (ml == null) return '';
  return unit === 'lb' ? String(Math.round(ml / ML_PER_FL_OZ)) : String(ml);
}

export type DrinkPreset = {
  name: string;
  volumeMl: number;
  sodiumMg: number;
  potassiumMg: number;
};

/**
 * Typical values from product labels and USDA FoodData Central. Brands vary,
 * so the drink form lets the user change any number to match their label.
 */
export const DRINK_PRESETS: readonly DrinkPreset[] = [
  { name: 'Water', volumeMl: 500, sodiumMg: 0, potassiumMg: 0 },
  { name: 'Sports drink, 20 oz bottle', volumeMl: 591, sodiumMg: 270, potassiumMg: 75 },
  { name: 'Oral rehydration solution', volumeMl: 500, sodiumMg: 520, potassiumMg: 390 },
  { name: 'Electrolyte drink mix', volumeMl: 500, sodiumMg: 500, potassiumMg: 370 },
  { name: 'Chocolate milk, 1 cup', volumeMl: 240, sodiumMg: 150, potassiumMg: 420 },
  { name: 'Coconut water, 1 cup', volumeMl: 240, sodiumMg: 250, potassiumMg: 600 },
  { name: 'Milk, 1 cup', volumeMl: 240, sodiumMg: 105, potassiumMg: 365 },
];
