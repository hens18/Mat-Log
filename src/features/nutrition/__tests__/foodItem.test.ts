import {
  fromOpenFoodFacts,
  fromUsda,
  genericFirst,
  nutritionFor,
  parseQuantity,
  tidyName,
  withStandardServings,
  type FoodItem,
  type UsdaFood,
} from '../foodItem';
// Real API responses, trimmed to the fields the app reads.
import offProduct from './fixtures/off-product.json';
import usdaBranded from './fixtures/usda-search-branded.json';

// Generic foods, modeled on USDA's documented search result format for the
// SR Legacy and Foundation datasets.
const greekYogurt: UsdaFood = {
  fdcId: 170894,
  description: 'Yogurt, Greek, plain, nonfat',
  dataType: 'SR Legacy',
  foodMeasures: [
    { disseminationText: '1 cup', gramWeight: 245, rank: 2 },
    { disseminationText: '1 container (6 oz)', gramWeight: 170, rank: 1 },
    { disseminationText: 'Quantity not specified', gramWeight: 150, rank: 3 },
  ],
  foodNutrients: [
    { nutrientId: 1008, unitName: 'KCAL', value: 59 },
    { nutrientId: 1003, unitName: 'G', value: 10.2 },
    { nutrientId: 1004, unitName: 'G', value: 0.39 },
    { nutrientId: 1005, unitName: 'G', value: 3.6 },
  ],
};

const foundationBanana: UsdaFood = {
  fdcId: 1105314,
  description: 'Bananas, ripe and slightly ripe, raw',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrientId: 2047, unitName: 'KCAL', value: 97.5 },
    { nutrientId: 1003, unitName: 'G', value: 0.74 },
  ],
};

describe('tidyName', () => {
  it('title-cases all-caps names', () => {
    expect(tidyName('CHICKEN BREAST')).toBe('Chicken Breast');
    expect(tidyName('  GIANT  EAGLE ')).toBe('Giant Eagle');
  });

  it('leaves mixed-case names alone', () => {
    expect(tidyName('Yogurt, Greek, plain')).toBe('Yogurt, Greek, plain');
  });
});

describe('fromUsda', () => {
  const [giantEagle, tyson] = (usdaBranded.foods as UsdaFood[]).map((f) => fromUsda(f)!);

  it('reads branded foods with their serving size', () => {
    expect(giantEagle).toMatchObject({
      key: 'usda:2187885',
      name: 'Chicken Breast',
      brand: 'Giant Eagle',
      generic: false,
      per100g: { calories: 165, protein: 20.4, carbs: 1.06, fat: 8.1 },
    });
    expect(giantEagle.servings[0]).toEqual({ label: '1 Chicken Breast · 284 g', grams: 284 });
    expect(tyson.servings[0]).toEqual({ label: '1 Slice · 28 g', grams: 28 });
  });

  it('reads generic foods with household measures in rank order', () => {
    const yogurt = fromUsda(greekYogurt)!;
    expect(yogurt.generic).toBe(true);
    expect(yogurt.brand).toBeNull();
    expect(yogurt.servings.map((s) => s.label)).toEqual([
      '1 container (6 oz) · 170 g',
      '1 cup · 245 g',
      '100 g',
      '1 oz · 28.35 g',
      '1 g',
    ]);
  });

  it('falls back to Atwater energy for Foundation foods', () => {
    const banana = fromUsda(foundationBanana)!;
    expect(banana.per100g).toEqual({
      calories: 97.5,
      protein: 0.74,
      carbs: null,
      fat: null,
      micros: {},
    });
  });

  it('skips foods without calories', () => {
    expect(fromUsda({ fdcId: 1, description: 'Water', foodNutrients: [] })).toBeNull();
  });

  it('puts generic foods first without reordering within each group', () => {
    const items = [giantEagle, fromUsda(greekYogurt)!, tyson, fromUsda(foundationBanana)!];
    expect(genericFirst(items).map((i) => i.sourceId)).toEqual([
      '170894',
      '1105314',
      '2187885',
      '2092152',
    ]);
  });
});

describe('fromOpenFoodFacts', () => {
  it('reads a product with per-100 g nutrition and its serving', () => {
    const item = fromOpenFoodFacts(offProduct.product, offProduct.code)!;
    expect(item).toMatchObject({
      key: 'open_food_facts:0737628064502',
      brand: 'Simply Asia',
      per100g: { calories: 385, protein: 9.6, carbs: 71.2, fat: 7.7 },
    });
    expect(item.servings[0]).toEqual({ label: '1 serving, 0.333 PACKAGE (52 g)', grams: 52 });
    // Matches the label's own per-serving calories (200 kcal).
    expect(nutritionFor(item, item.servings[0], 1).calories).toBe(200);
  });

  it('derives per-100 g values from per-serving values', () => {
    const item = fromOpenFoodFacts(
      {
        product_name: 'Protein bar',
        serving_quantity: '60',
        nutriments: { 'energy-kcal_serving': 240, proteins_serving: 20 },
      },
      '123',
    )!;
    expect(item.per100g).toMatchObject({ calories: 400, protein: 33.3 });
  });

  it('converts kilojoules when kcal is missing', () => {
    const item = fromOpenFoodFacts(
      { product_name: 'Juice', nutriments: { energy_100g: 418.4 } },
      '1',
    )!;
    expect(item.per100g.calories).toBe(100);
  });

  it('returns null without a name or calories', () => {
    expect(fromOpenFoodFacts({ nutriments: { 'energy-kcal_100g': 100 } }, '1')).toBeNull();
    expect(fromOpenFoodFacts({ product_name: 'Mystery' }, '1')).toBeNull();
  });
});

describe('nutritionFor', () => {
  const yogurt = fromUsda(greekYogurt) as FoodItem;

  it('scales per-100 g nutrition by serving and quantity', () => {
    expect(nutritionFor(yogurt, { label: '1 cup · 245 g', grams: 245 }, 2)).toEqual({
      calories: 289,
      protein: 50,
      carbs: 17.6,
      fat: 1.9,
      micros: {},
    });
  });

  it('keeps missing macros missing', () => {
    const banana = fromUsda(foundationBanana)!;
    expect(nutritionFor(banana, { label: '100 g', grams: 100 }, 1).fat).toBeNull();
  });
});

describe('withStandardServings', () => {
  it('dedupes labels and drops zero-gram servings', () => {
    expect(
      withStandardServings([
        { label: '100 g', grams: 100 },
        { label: 'Broken', grams: 0 },
      ]).map((s) => s.label),
    ).toEqual(['100 g', '1 oz · 28.35 g', '1 g']);
  });
});

describe('parseQuantity', () => {
  it('parses decimal servings', () => {
    expect(parseQuantity('1.5')).toBe(1.5);
    expect(parseQuantity('0,25')).toBe(0.25);
    expect(parseQuantity('.5')).toBe(0.5);
  });

  it('rejects zero, junk, and huge amounts', () => {
    expect(parseQuantity('0')).toBeNull();
    expect(parseQuantity('abc')).toBeNull();
    expect(parseQuantity('101')).toBeNull();
  });
});
