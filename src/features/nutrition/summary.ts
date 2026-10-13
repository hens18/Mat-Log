import type { Enums, Tables } from '@/types/database';

export type MealType = Enums<'meal_type'>;
export type FoodLog = Tables<'food_logs'>;

export const MEALS: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

type Macros = { protein: number; carbs: number; fat: number };

export type DaySummary = Macros & {
  calories: number;
  byMeal: Record<MealType, { calories: number; entries: FoodLog[] }>;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Totals for one day's entries, grouped by meal in logging order. */
export function summarizeDay(entries: readonly FoodLog[]): DaySummary {
  const byMeal = Object.fromEntries(
    MEALS.map((meal) => [meal, { calories: 0, entries: [] as FoodLog[] }]),
  ) as DaySummary['byMeal'];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  const sorted = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const entry of sorted) {
    calories += entry.calories;
    protein += entry.protein_g ?? 0;
    carbs += entry.carbs_g ?? 0;
    fat += entry.fat_g ?? 0;
    byMeal[entry.meal].calories += entry.calories;
    byMeal[entry.meal].entries.push(entry);
  }

  return { calories, protein: round1(protein), carbs: round1(carbs), fat: round1(fat), byMeal };
}

export type CalorieProgress = {
  /** 0 to 1, how much of the goal has been eaten. */
  fraction: number;
  remaining: number;
  over: boolean;
};

export function calorieProgress(eaten: number, goal: number): CalorieProgress {
  if (goal <= 0) return { fraction: 0, remaining: 0, over: false };
  return {
    fraction: Math.min(1, eaten / goal),
    remaining: Math.abs(goal - eaten),
    over: eaten > goal,
  };
}

/** Share of calories from each macro (protein and carbs 4 kcal/g, fat 9 kcal/g). */
export function macroSplit({ protein, carbs, fat }: Macros): Macros {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: (protein * 4) / total, carbs: (carbs * 4) / total, fat: (fat * 9) / total };
}

export type FoodTemplate = Pick<
  FoodLog,
  'name' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'meal'
>;

/** Distinct foods (by name, ignoring case), most recently logged first, for one-tap re-logging. */
export function recentFoods(entries: readonly FoodLog[], limit = 8): FoodTemplate[] {
  const newestFirst = [...entries].sort(
    (a, b) => b.logged_on.localeCompare(a.logged_on) || b.created_at.localeCompare(a.created_at),
  );
  const seen = new Set<string>();
  const result: FoodTemplate[] = [];
  for (const { name, calories, protein_g, carbs_g, fat_g, meal } of newestFirst) {
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name, calories, protein_g, carbs_g, fat_g, meal });
    if (result.length === limit) break;
  }
  return result;
}

/** Whole calories between 0 and 10,000; null when invalid. */
export function parseCalories(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= 10000 ? value : null;
}

/** Optional grams with one decimal; empty means not recorded. */
export function parseGrams(input: string): number | null | 'invalid' {
  const trimmed = input.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 'invalid';
  const value = round1(Number(trimmed));
  return value < 1000 ? value : 'invalid';
}

/** The meal that fits the time of day, as a default for new entries. */
export function defaultMealForTime(date: Date): MealType {
  const hour = date.getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}
