// The user's food library: foods they created, foods they starred, and meals
// they saved. Pure helpers that convert between database rows and the shapes
// the screens use.

import type { Json, Tables } from '@/types/database';

import type { FoodInput } from './api';
import { nutritionFor, withStandardServings, type FoodItem, type ServingOption } from './foodItem';
import { parseMicros, scaleMicros } from './micros';
import type { FoodLog, FoodTemplate, MealType } from './summary';

export type CustomFood = Tables<'custom_foods'>;
export type FavoriteFood = Tables<'favorite_foods'>;
export type SavedMeal = Tables<'saved_meals'>;

/** One food inside a saved meal: a logged entry without its day or meal. */
export type SavedMealItem = Omit<FoodTemplate, 'meal'>;

export const customFoodKey = (id: string) => `custom:${id}`;

/**
 * A custom food as a FoodItem so it can be logged like any other food. With a
 * gram weight the usual gram and ounce servings are offered; without one, the
 * food's own serving is the only option (stored internally as "100 g" so the
 * per-100 g math still works).
 */
export function fromCustomFood(food: CustomFood): FoodItem {
  const grams = food.serving_grams && food.serving_grams > 0 ? food.serving_grams : null;
  const factor = grams ? 100 / grams : 1;
  const scale = (value: number | null) =>
    value == null ? null : Math.round(value * factor * 10) / 10;
  const serving: ServingOption = {
    label: grams ? `${food.serving_label} · ${formatGrams(grams)}` : food.serving_label,
    grams: grams ?? 100,
  };
  return {
    key: customFoodKey(food.id),
    source: 'custom',
    sourceId: food.id,
    name: food.name,
    brand: food.brand,
    generic: false,
    per100g: {
      calories: Math.round(food.calories * factor * 10) / 10,
      protein: scale(food.protein_g),
      carbs: scale(food.carbs_g),
      fat: scale(food.fat_g),
      micros: scaleMicros(parseMicros(food.micros) ?? {}, factor),
    },
    servings: grams ? withStandardServings([serving]) : [serving],
  };
}

function formatGrams(grams: number): string {
  return `${Number.isInteger(grams) ? grams : Math.round(grams * 10) / 10} g`;
}

/** Reads a favorite's stored snapshot back, or null if it isn't a usable FoodItem. */
export function parseFavoriteItem(value: Json): FoodItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as unknown as Partial<FoodItem>;
  const valid =
    typeof item.key === 'string' &&
    typeof item.name === 'string' &&
    (item.source === 'usda' || item.source === 'open_food_facts' || item.source === 'custom') &&
    typeof item.per100g?.calories === 'number' &&
    Array.isArray(item.servings) &&
    item.servings.length > 0 &&
    item.servings.every((s) => typeof s?.label === 'string' && typeof s?.grams === 'number');
  if (!valid) return null;
  return {
    ...(item as FoodItem),
    per100g: { ...item.per100g!, micros: parseMicros(item.per100g!.micros as Json) ?? {} },
  };
}

/** The pieces of logged entries worth keeping in a saved meal. */
export function mealItemsFromEntries(entries: readonly FoodLog[]): SavedMealItem[] {
  return entries.map((e) => ({
    name: e.name,
    brand: e.brand,
    calories: e.calories,
    protein_g: e.protein_g,
    carbs_g: e.carbs_g,
    fat_g: e.fat_g,
    servings: e.servings,
    serving_label: e.serving_label,
    source: e.source,
    source_id: e.source_id,
    micros: e.micros,
  }));
}

const SOURCES = new Set(['custom', 'usda', 'open_food_facts']);
const optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const optionalString = (value: unknown) => (typeof value === 'string' ? value : null);

/** Reads a saved meal's items back, dropping anything malformed. */
export function parseMealItems(value: Json): SavedMealItem[] {
  if (!Array.isArray(value)) return [];
  const items: SavedMealItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const r = raw as Record<string, Json | undefined>;
    if (typeof r.name !== 'string' || typeof r.calories !== 'number') continue;
    items.push({
      name: r.name,
      brand: optionalString(r.brand),
      calories: Math.round(r.calories),
      protein_g: optionalNumber(r.protein_g),
      carbs_g: optionalNumber(r.carbs_g),
      fat_g: optionalNumber(r.fat_g),
      servings: optionalNumber(r.servings) ?? 1,
      serving_label: optionalString(r.serving_label),
      source: SOURCES.has(r.source as string) ? (r.source as SavedMealItem['source']) : 'custom',
      source_id: optionalString(r.source_id),
      micros: parseMicros(r.micros ?? null),
    });
  }
  return items;
}

export type MealTotals = { calories: number; protein: number; carbs: number; fat: number };

export function mealTotals(items: readonly SavedMealItem[]): MealTotals {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const sum = (pick: (i: SavedMealItem) => number | null) =>
    round1(items.reduce((total, i) => total + (pick(i) ?? 0), 0));
  return {
    calories: Math.round(items.reduce((total, i) => total + i.calories, 0)),
    protein: sum((i) => i.protein_g),
    carbs: sum((i) => i.carbs_g),
    fat: sum((i) => i.fat_g),
  };
}

/** Food log rows for logging a saved meal into one meal on one day. */
export function mealToInputs(
  items: readonly SavedMealItem[],
  meal: MealType,
  loggedOn: string,
): FoodInput[] {
  return items.map((item) => ({ ...item, meal, logged_on: loggedOn }));
}

/** A log entry (without day or meal) for some number of one of a food's servings. */
export function entryFromItem(
  item: FoodItem,
  serving: ServingOption = item.servings[0],
  quantity = 1,
): SavedMealItem {
  const totals = nutritionFor(item, serving, quantity);
  return {
    name: item.name,
    brand: item.brand,
    calories: totals.calories,
    protein_g: totals.protein,
    carbs_g: totals.carbs,
    fat_g: totals.fat,
    servings: quantity,
    serving_label: serving.label.slice(0, 80),
    source: item.source,
    source_id: item.sourceId,
    micros: Object.keys(totals.micros).length ? totals.micros : null,
  };
}
