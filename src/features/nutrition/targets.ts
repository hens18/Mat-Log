// Personal daily targets for each micronutrient. With sex (and ideally birth
// year) on the profile, targets come from the Dietary Reference Intakes (RDA
// or AI) published by the National Academies, as summarized in the NIH Office
// of Dietary Supplements fact sheets. Without them, the general FDA Daily
// Values are used. Fiber and saturated fat follow the calorie goal when one is
// set, since both guidelines are defined per calorie.

import type { WeightUnit } from '@/types/models';

import { MICRONUTRIENTS, type MicroKey } from './micros';

export type Sex = 'male' | 'female';
export type AgeGroup = '9-13' | '14-18' | '19-30' | '31-50' | '51+';

type IntakeKey = Exclude<MicroKey, 'sugar' | 'saturatedFat' | 'cholesterol'>;

/** [male, female] for each nutrient and age group. */
const INTAKES: Record<AgeGroup, Record<IntakeKey, readonly [number, number]>> = {
  '9-13': {
    sodium: [1800, 1800],
    fiber: [31, 26],
    potassium: [2500, 2300],
    calcium: [1300, 1300],
    iron: [8, 8],
    magnesium: [240, 240],
    zinc: [8, 8],
    vitaminA: [600, 600],
    vitaminC: [45, 45],
    vitaminD: [15, 15],
    vitaminB12: [1.8, 1.8],
  },
  '14-18': {
    sodium: [2300, 2300],
    fiber: [38, 26],
    potassium: [3000, 2300],
    calcium: [1300, 1300],
    iron: [11, 15],
    magnesium: [410, 360],
    zinc: [11, 9],
    vitaminA: [900, 700],
    vitaminC: [75, 65],
    vitaminD: [15, 15],
    vitaminB12: [2.4, 2.4],
  },
  '19-30': {
    sodium: [2300, 2300],
    fiber: [38, 25],
    potassium: [3400, 2600],
    calcium: [1000, 1000],
    iron: [8, 18],
    magnesium: [400, 310],
    zinc: [11, 8],
    vitaminA: [900, 700],
    vitaminC: [90, 75],
    vitaminD: [15, 15],
    vitaminB12: [2.4, 2.4],
  },
  '31-50': {
    sodium: [2300, 2300],
    fiber: [38, 25],
    potassium: [3400, 2600],
    calcium: [1000, 1000],
    iron: [8, 18],
    magnesium: [420, 320],
    zinc: [11, 8],
    vitaminA: [900, 700],
    vitaminC: [90, 75],
    vitaminD: [15, 15],
    vitaminB12: [2.4, 2.4],
  },
  '51+': {
    sodium: [2300, 2300],
    fiber: [30, 21],
    potassium: [3400, 2600],
    calcium: [1000, 1200],
    iron: [8, 8],
    magnesium: [420, 320],
    zinc: [11, 8],
    vitaminA: [900, 700],
    vitaminC: [90, 75],
    vitaminD: [15, 15],
    vitaminB12: [2.4, 2.4],
  },
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '9-13': 'ages 9 to 13',
  '14-18': 'ages 14 to 18',
  '19-30': 'ages 19 to 30',
  '31-50': 'ages 31 to 50',
  '51+': 'ages 51 and up',
};

export type TargetInput = {
  sex: Sex | null;
  birthYear: number | null;
  calorieGoal: number | null;
};

export type NutrientTargets = {
  /** Daily target for each nutrient, or null when there isn't one. */
  values: Record<MicroKey, number | null>;
  /** True when targets are based on sex and age rather than the FDA Daily Values. */
  personalized: boolean;
  sex: Sex | null;
  ageGroup: AgeGroup | null;
  /** True when no birth year was given and adult (19 to 30) targets were assumed. */
  ageAssumed: boolean;
  /** True when fiber and saturated fat targets come from the calorie goal. */
  fromCalories: boolean;
};

/** Age group from a birth year. Age may be a year high before the birthday. */
export function ageGroupFor(birthYear: number, now: Date = new Date()): AgeGroup {
  const age = now.getFullYear() - birthYear;
  if (age <= 13) return '9-13';
  if (age <= 18) return '14-18';
  if (age <= 30) return '19-30';
  if (age <= 50) return '31-50';
  return '51+';
}

export function nutrientTargets(input: TargetInput, now: Date = new Date()): NutrientTargets {
  const values = {} as Record<MicroKey, number | null>;
  for (const def of MICRONUTRIENTS) values[def.key] = def.dailyValue;

  const { sex, birthYear, calorieGoal } = input;
  const ageGroup = sex ? (birthYear ? ageGroupFor(birthYear, now) : '19-30') : null;
  if (sex && ageGroup) {
    const index = sex === 'male' ? 0 : 1;
    const intakes = INTAKES[ageGroup];
    for (const key of Object.keys(intakes) as IntakeKey[]) values[key] = intakes[key][index];
  }

  if (calorieGoal) {
    // 14 g of fiber per 1,000 kcal; saturated fat under 10% of calories (9 kcal per gram).
    values.fiber = Math.round((calorieGoal / 1000) * 14);
    values.saturatedFat = Math.round((calorieGoal * 0.1) / 9);
  }

  return {
    values,
    personalized: sex !== null,
    sex,
    ageGroup,
    ageAssumed: sex !== null && !birthYear,
    fromCalories: !!calorieGoal,
  };
}

/** One line describing where the targets come from. */
export function describeTargets(targets: NutrientTargets): string {
  if (!targets.personalized || !targets.sex || !targets.ageGroup) {
    return 'Using general FDA Daily Values. Add your sex and birth year in Profile for personal targets.';
  }
  const who = `${targets.sex === 'male' ? 'Male' : 'Female'}, ${AGE_GROUP_LABELS[targets.ageGroup]}`;
  return targets.ageAssumed
    ? `${who} (assumed). Add your birth year in Profile for age-specific targets.`
    : `Targets for: ${who}.`;
}

export type ProteinTarget = {
  /** Middle of the recommended range, in grams per day. */
  grams: number;
  low: number;
  high: number;
  weightKg: number;
};

const LB_PER_KG = 2.20462;

/**
 * Daily protein for athletes in training: 1.4 to 2.0 g per kg of body weight
 * (International Society of Sports Nutrition position stand), aiming for 1.6.
 */
export function proteinTarget(weight: number | null, unit: WeightUnit): ProteinTarget | null {
  if (!weight || weight <= 0) return null;
  const weightKg = unit === 'kg' ? weight : weight / LB_PER_KG;
  return {
    grams: Math.round(weightKg * 1.6),
    low: Math.round(weightKg * 1.4),
    high: Math.round(weightKg * 2.0),
    weightKg: Math.round(weightKg * 10) / 10,
  };
}

/** Percent of a target, or null when there is no target. */
export function percentOfTarget(target: number | null, amount: number): number | null {
  return target ? Math.round((amount / target) * 100) : null;
}

/** Column caption for percentages: personal targets or FDA Daily Values. */
export function percentCaption(targets: NutrientTargets): string {
  return targets.personalized ? '% of your target' : '% Daily Value';
}
