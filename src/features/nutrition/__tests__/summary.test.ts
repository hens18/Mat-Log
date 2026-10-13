import {
  calorieProgress,
  defaultMealForTime,
  macroSplit,
  parseCalories,
  parseGrams,
  recentFoods,
  summarizeDay,
  type FoodLog,
} from '../summary';

let seq = 0;
function food(partial: Partial<FoodLog> & Pick<FoodLog, 'name' | 'calories'>): FoodLog {
  seq += 1;
  return {
    id: `f${seq}`,
    user_id: 'u',
    logged_on: '2026-10-13',
    meal: 'breakfast',
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    brand: null,
    servings: 1,
    serving_label: null,
    source: 'custom',
    source_id: null,
    created_at: `2026-10-13T08:00:${String(seq).padStart(2, '0')}Z`,
    updated_at: '',
    ...partial,
  };
}

describe('summarizeDay', () => {
  it('totals calories and macros and groups by meal', () => {
    const summary = summarizeDay([
      food({ name: 'Eggs', calories: 210, protein_g: 18, fat_g: 15 }),
      food({ name: 'Rice', calories: 300, meal: 'lunch', carbs_g: 65.5, protein_g: 6 }),
      food({ name: 'Toast', calories: 120, carbs_g: 20 }),
    ]);
    expect(summary.calories).toBe(630);
    expect(summary).toMatchObject({ protein: 24, carbs: 85.5, fat: 15 });
    expect(summary.byMeal.breakfast.calories).toBe(330);
    expect(summary.byMeal.breakfast.entries.map((e) => e.name)).toEqual(['Eggs', 'Toast']);
    expect(summary.byMeal.dinner).toEqual({ calories: 0, entries: [] });
  });
});

describe('calorieProgress', () => {
  it('reports remaining calories under the goal', () => {
    expect(calorieProgress(1500, 2000)).toEqual({ fraction: 0.75, remaining: 500, over: false });
  });

  it('caps the ring at full and flags going over', () => {
    expect(calorieProgress(2300, 2000)).toEqual({ fraction: 1, remaining: 300, over: true });
  });

  it('handles a missing goal', () => {
    expect(calorieProgress(500, 0)).toEqual({ fraction: 0, remaining: 0, over: false });
  });
});

describe('macroSplit', () => {
  it('weights fat at 9 kcal per gram', () => {
    const split = macroSplit({ protein: 25, carbs: 25, fat: 100 / 9 });
    expect(split.protein).toBeCloseTo(1 / 3);
    expect(split.fat).toBeCloseTo(1 / 3);
  });

  it('returns zeros with no macros', () => {
    expect(macroSplit({ protein: 0, carbs: 0, fat: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('recentFoods', () => {
  it('dedupes by name and lists the newest first', () => {
    const recents = recentFoods([
      food({ name: 'Oatmeal', calories: 150, logged_on: '2026-10-11' }),
      food({ name: 'oatmeal ', calories: 300, logged_on: '2026-10-12' }),
      food({ name: 'Banana', calories: 105, logged_on: '2026-10-10' }),
    ]);
    expect(recents.map((r) => [r.name, r.calories])).toEqual([
      ['oatmeal ', 300],
      ['Banana', 105],
    ]);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => food({ name: `Food ${i}`, calories: i }));
    expect(recentFoods(many, 5)).toHaveLength(5);
  });
});

describe('parsing', () => {
  it('parses whole calories', () => {
    expect(parseCalories('450')).toBe(450);
    expect(parseCalories('0')).toBe(0);
    expect(parseCalories('12.5')).toBeNull();
    expect(parseCalories('20000')).toBeNull();
    expect(parseCalories('')).toBeNull();
  });

  it('parses optional grams', () => {
    expect(parseGrams('')).toBeNull();
    expect(parseGrams('12,25')).toBe(12.3);
    expect(parseGrams('abc')).toBe('invalid');
    expect(parseGrams('1000')).toBe('invalid');
  });
});

describe('defaultMealForTime', () => {
  const at = (hour: number) => new Date(2026, 9, 13, hour);
  it('picks a meal from the hour', () => {
    expect(defaultMealForTime(at(7))).toBe('breakfast');
    expect(defaultMealForTime(at(12))).toBe('lunch');
    expect(defaultMealForTime(at(16))).toBe('snack');
    expect(defaultMealForTime(at(18))).toBe('dinner');
    expect(defaultMealForTime(at(22))).toBe('snack');
  });
});
