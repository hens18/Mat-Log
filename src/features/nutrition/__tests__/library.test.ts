import { nutritionFor } from '../foodItem';
import {
  entryFromItem,
  fromCustomFood,
  mealItemsFromEntries,
  mealToInputs,
  mealTotals,
  parseFavoriteItem,
  parseMealItems,
  type CustomFood,
} from '../library';
import type { FoodLog } from '../summary';

const base: CustomFood = {
  id: 'abc',
  user_id: 'u1',
  name: 'Mom’s protein bar',
  brand: null,
  serving_label: '1 bar',
  serving_grams: null,
  calories: 250,
  protein_g: 20,
  carbs_g: 25,
  fat_g: 8,
  micros: { sodium: 180, potassium: 200 },
  created_at: '',
  updated_at: '',
};

describe('fromCustomFood', () => {
  it('logs exactly one serving per serving when there is no gram weight', () => {
    const item = fromCustomFood(base);
    expect(item.key).toBe('custom:abc');
    expect(item.servings).toEqual([{ label: '1 bar', grams: 100 }]);
    const two = nutritionFor(item, item.servings[0], 2);
    expect(two).toEqual({
      calories: 500,
      protein: 40,
      carbs: 50,
      fat: 16,
      micros: { sodium: 360, potassium: 400 },
    });
  });

  it('offers gram servings when the serving weight is known', () => {
    const item = fromCustomFood({ ...base, serving_grams: 50 });
    expect(item.servings.map((s) => s.label)).toEqual([
      '1 bar · 50 g',
      '100 g',
      '1 oz · 28.35 g',
      '1 g',
    ]);
    expect(item.per100g.calories).toBe(500);
    expect(nutritionFor(item, item.servings[0], 1).calories).toBe(250);
    expect(nutritionFor(item, item.servings[1], 1).protein).toBe(40);
  });
});

describe('parseFavoriteItem', () => {
  it('round-trips a FoodItem snapshot', () => {
    const item = fromCustomFood(base);
    expect(parseFavoriteItem(JSON.parse(JSON.stringify(item)))).toEqual(item);
  });

  it('rejects malformed snapshots', () => {
    expect(parseFavoriteItem({ key: 'x', name: 'y' })).toBeNull();
    expect(parseFavoriteItem(null)).toBeNull();
    expect(parseFavoriteItem([1, 2])).toBeNull();
  });
});

const entry = (name: string, calories: number, protein: number | null): FoodLog => ({
  id: name,
  user_id: 'u1',
  logged_on: '2026-10-13',
  meal: 'breakfast',
  name,
  brand: null,
  calories,
  protein_g: protein,
  carbs_g: 10,
  fat_g: null,
  servings: 1,
  serving_label: '1 cup',
  source: 'usda',
  source_id: '1',
  micros: { calcium: 100 },
  created_at: '',
  updated_at: '',
});

describe('saved meals', () => {
  const items = mealItemsFromEntries([entry('Oatmeal', 150, 5), entry('Milk', 120.4, null)]);

  it('keeps the food details but not the day or meal', () => {
    expect(items[0]).not.toHaveProperty('meal');
    expect(items[0]).not.toHaveProperty('logged_on');
    expect(items[0]).toMatchObject({
      name: 'Oatmeal',
      serving_label: '1 cup',
      micros: { calcium: 100 },
    });
  });

  it('totals calories and macros, treating missing macros as zero', () => {
    expect(mealTotals(items)).toEqual({ calories: 270, protein: 5, carbs: 20, fat: 0 });
  });

  it('builds food log rows for the chosen meal and day', () => {
    const rows = mealToInputs(items, 'dinner', '2026-10-14');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ name: 'Milk', meal: 'dinner', logged_on: '2026-10-14' });
  });

  it('parses stored items and drops malformed ones', () => {
    const parsed = parseMealItems([
      ...JSON.parse(JSON.stringify(items)),
      { name: 'No calories' },
      'junk',
      { name: 'Bare', calories: 99.6, source: 'nonsense' },
    ]);
    expect(parsed.map((i) => i.name)).toEqual(['Oatmeal', 'Milk', 'Bare']);
    expect(parsed[2]).toMatchObject({ calories: 100, servings: 1, source: 'custom', micros: null });
    expect(parseMealItems({ not: 'an array' })).toEqual([]);
  });
});

describe('entryFromItem', () => {
  it('builds a log entry for a serving and quantity', () => {
    const item = fromCustomFood({ ...base, serving_grams: 50 });
    expect(entryFromItem(item, item.servings[0], 1.5)).toEqual({
      name: 'Mom’s protein bar',
      brand: null,
      calories: 375,
      protein_g: 30,
      carbs_g: 37.5,
      fat_g: 12,
      servings: 1.5,
      serving_label: '1 bar · 50 g',
      source: 'custom',
      source_id: 'abc',
      micros: { sodium: 270, potassium: 300 },
    });
  });
});
