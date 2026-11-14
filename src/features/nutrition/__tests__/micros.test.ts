import { fromOpenFoodFacts, fromUsda, nutritionFor, type UsdaFood } from '../foodItem';
import {
  MICRONUTRIENTS,
  formatMicro,
  microsFromOpenFoodFacts,
  microsFromUsda,
  parseMicros,
  percentDailyValue,
  roundAmount,
  scaleMicros,
  sumMicros,
} from '../micros';
// Real API responses.
import nutella from './fixtures/off-product-micros.json';
import usdaBranded from './fixtures/usda-search-branded.json';

const def = (key: string) => MICRONUTRIENTS.find((d) => d.key === key)!;

describe('microsFromUsda', () => {
  it('reads micronutrients from a real branded search result', () => {
    const chicken = fromUsda(usdaBranded.foods[0] as UsdaFood)!;
    expect(chicken.per100g.micros).toEqual({
      sodium: 433,
      sugar: 0.7,
      saturatedFat: 4.58,
      cholesterol: 67,
      fiber: 0,
      calcium: 158,
      iron: 0.38,
      vitaminC: 1.7,
    });
  });

  it('skips vitamin A in IU, which has no fixed conversion to µg RAE', () => {
    expect(microsFromUsda(new Map([[1104, 352]]))).toEqual({});
  });

  it('converts vitamin D from IU when µg is missing, and prefers µg', () => {
    expect(microsFromUsda(new Map([[1110, 400]]))).toEqual({ vitaminD: 10 });
    expect(
      microsFromUsda(
        new Map([
          [1110, 400],
          [1114, 2],
        ]),
      ),
    ).toEqual({ vitaminD: 2 });
  });
});

describe('microsFromOpenFoodFacts', () => {
  it('converts real Open Food Facts values from grams', () => {
    const item = fromOpenFoodFacts(nutella.product, nutella.code)!;
    expect(item.per100g.micros).toMatchObject({
      sodium: 42.8,
      saturatedFat: 10.6,
      sugar: 56.3,
      fiber: 0,
    });
  });

  it('converts vitamins to µg and minerals to mg', () => {
    expect(
      microsFromOpenFoodFacts({ 'vitamin-d_100g': 0.000005, iron_100g: 0.0036 }, null),
    ).toEqual({ vitaminD: 5, iron: 3.6 });
  });

  it('scales per-serving values up to 100 g', () => {
    expect(microsFromOpenFoodFacts({ sodium_serving: 0.12 }, 40)).toEqual({ sodium: 300 });
  });
});

describe('scaling and totals', () => {
  it('scales micros with the serving like calories', () => {
    const chicken = fromUsda(usdaBranded.foods[0] as UsdaFood)!;
    const breast = chicken.servings[0]; // 284 g
    expect(nutritionFor(chicken, breast, 1).micros.sodium).toBe(1230);
    expect(scaleMicros({ iron: 0.38, zinc: 0.1 }, 2.84)).toEqual({ iron: 1.1, zinc: 0.28 });
  });

  it('sums a day and counts entries with data', () => {
    const result = sumMicros([
      { micros: { sodium: 433, fiber: 2 } },
      { micros: { sodium: 120 } },
      { micros: null }, // quick add
    ]);
    expect(result).toEqual({
      totals: { sodium: 553, fiber: 2 },
      entriesWithData: 2,
      totalEntries: 3,
    });
  });
});

describe('parseMicros', () => {
  it('keeps known numeric keys only', () => {
    expect(parseMicros({ sodium: 10, bogus: 5, iron: 'lots' })).toEqual({ sodium: 10 });
  });

  it('returns null for missing or empty data', () => {
    expect(parseMicros(null)).toBeNull();
    expect(parseMicros({})).toBeNull();
    expect(parseMicros([1, 2])).toBeNull();
  });
});

describe('display helpers', () => {
  it('computes percent of Daily Value', () => {
    expect(percentDailyValue(def('sodium'), 1150)).toBe(50);
    expect(percentDailyValue(def('sugar'), 30)).toBeNull();
  });

  it('rounds to sensible precision', () => {
    expect(roundAmount(1229.6)).toBe(1230);
    expect(roundAmount(12.34)).toBe(12.3);
    expect(roundAmount(0.0456)).toBe(0.05);
    expect(formatMicro(def('vitaminB12'), 0.6)).toBe('0.6 µg');
  });
});
