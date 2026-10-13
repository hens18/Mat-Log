import { microsFromOpenFoodFacts, microsFromUsda, scaleMicros, type Micros } from './micros';

// A food picked from a database (USDA FoodData Central or Open Food Facts) or
// from the user's own foods, normalized to one shape. Nutrition is stored per 100 g so any serving can
// be computed from it.

export type FoodSource = 'usda' | 'open_food_facts' | 'custom';

export type Nutrition = {
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  /** Only the micronutrients the source reported. */
  micros: Micros;
};

export type ServingOption = {
  label: string;
  grams: number;
};

export type FoodItem = {
  /** Stable id such as "usda:2187885", "open_food_facts:0737628064502", or "custom:<uuid>". */
  key: string;
  source: FoodSource;
  sourceId: string;
  name: string;
  brand: string | null;
  /** Generic foods (no brand) from USDA's reference databases. */
  generic: boolean;
  per100g: Nutrition;
  /** Most useful first. Always ends with grams and ounces. */
  servings: ServingOption[];
};

const OUNCE_GRAMS = 28.35;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** "CHICKEN BREAST" -> "Chicken Breast". Leaves mixed-case text alone. */
export function tidyName(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s(/-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

function formatGrams(grams: number): string {
  return `${Number.isInteger(grams) ? grams : round1(grams)} g`;
}

/** Adds grams to a label unless it already mentions them. */
function servingLabel(text: string, grams: number): string {
  return /\d\s*(g|ml)\b/i.test(text) ? text : `${text} · ${formatGrams(grams)}`;
}

/** Dedupes by label and appends the standard 100 g, 1 oz, and 1 g options. */
export function withStandardServings(options: ServingOption[]): ServingOption[] {
  const all = [
    ...options.filter((o) => o.grams > 0),
    { label: '100 g', grams: 100 },
    { label: '1 oz · 28.35 g', grams: OUNCE_GRAMS },
    { label: '1 g', grams: 1 },
  ];
  const seen = new Set<string>();
  return all.filter((o) => {
    const key = o.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Totals for `quantity` of a serving. Calories are whole; macros keep one decimal. */
export function nutritionFor(item: FoodItem, serving: ServingOption, quantity: number): Nutrition {
  const factor = (serving.grams * quantity) / 100;
  const scale = (value: number | null) => (value == null ? null : round1(value * factor));
  return {
    calories: Math.round(item.per100g.calories * factor),
    protein: scale(item.per100g.protein),
    carbs: scale(item.per100g.carbs),
    fat: scale(item.per100g.fat),
    micros: scaleMicros(item.per100g.micros, factor),
  };
}

/** Parses a typed serving count like "1.5" or "1,5" (0 to 100). */
export function parseQuantity(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 100) / 100;
  return value > 0 && value <= 100 ? value : null;
}

// ---------------------------------------------------------------------------
// USDA FoodData Central
// ---------------------------------------------------------------------------

type UsdaNutrient = { nutrientId?: number; unitName?: string; value?: number };
type UsdaMeasure = { disseminationText?: string; gramWeight?: number; rank?: number };

export type UsdaFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodMeasures?: UsdaMeasure[];
  foodNutrients?: UsdaNutrient[];
};

const USDA_NUTRIENTS = {
  energyKcal: 1008,
  energyAtwaterGeneral: 2047,
  energyAtwaterSpecific: 2048,
  energyKj: 1062,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
} as const;

const GRAM_UNITS = new Set(['g', 'grm', 'ml', 'mlt']);

/**
 * Converts a USDA search result. Search results report nutrients per 100 g
 * (or 100 ml for drinks, treated as grams). Returns null without calories.
 */
export function fromUsda(food: UsdaFood): FoodItem | null {
  const values = new Map<number, number>();
  for (const n of food.foodNutrients ?? []) {
    if (n.nutrientId != null && typeof n.value === 'number') values.set(n.nutrientId, n.value);
  }
  const kj = values.get(USDA_NUTRIENTS.energyKj);
  const calories =
    values.get(USDA_NUTRIENTS.energyKcal) ??
    values.get(USDA_NUTRIENTS.energyAtwaterSpecific) ??
    values.get(USDA_NUTRIENTS.energyAtwaterGeneral) ??
    (kj != null ? kj / 4.184 : undefined);
  if (calories == null) return null;

  const servings: ServingOption[] = [];
  const unit = food.servingSizeUnit?.toLowerCase();
  if (food.servingSize && unit && GRAM_UNITS.has(unit)) {
    const text = food.householdServingFullText?.trim();
    servings.push({
      label: servingLabel(text ? tidyName(text) : '1 serving', food.servingSize),
      grams: food.servingSize,
    });
  }
  for (const m of [...(food.foodMeasures ?? [])].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))) {
    const text = m.disseminationText?.trim();
    if (!text || !m.gramWeight || /quantity not specified/i.test(text)) continue;
    servings.push({ label: servingLabel(text, m.gramWeight), grams: m.gramWeight });
  }

  const brand = food.brandName?.trim() || food.brandOwner?.trim() || null;
  return {
    key: `usda:${food.fdcId}`,
    source: 'usda',
    sourceId: String(food.fdcId),
    name: tidyName(food.description),
    brand: brand ? tidyName(brand) : null,
    generic: food.dataType !== 'Branded',
    per100g: {
      calories: round1(calories),
      protein: values.get(USDA_NUTRIENTS.protein) ?? null,
      carbs: values.get(USDA_NUTRIENTS.carbs) ?? null,
      fat: values.get(USDA_NUTRIENTS.fat) ?? null,
      micros: microsFromUsda(values),
    },
    servings: withStandardServings(servings),
  };
}

/** Lowercase words with accents and punctuation removed. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9%]+/)
    .filter(Boolean);
}

/** True when some word starts with the term, so "mil" (still typing) matches "milk". */
function matchesTerm(foodWords: string[], term: string): boolean {
  // "eggs" should still match "Egg, whole".
  const singular = term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term;
  return foodWords.some((w) => w.startsWith(term) || w.startsWith(singular));
}

/** How many of the search terms appear in a food's name or brand. */
export function matchScore(item: FoodItem, query: string): number {
  const foodWords = words(`${item.name} ${item.brand ?? ''}`);
  return words(query).filter((term) => matchesTerm(foodWords, term)).length;
}

/**
 * Orders search results so foods matching every word you typed come first.
 * Without this, finishing a word can bury the right answer: "fairlife mil"
 * only matches Fairlife products, but "fairlife milk" also matches every
 * generic milk, which would otherwise jump ahead. Among equally good matches,
 * generic foods lead (a search for "banana" should start with bananas, not
 * banana-flavored products), and USDA's own order breaks any remaining ties.
 */
export function rankResults(items: FoodItem[], query: string): FoodItem[] {
  return items
    .map((item, index) => ({ item, index, score: matchScore(item, query) }))
    .sort(
      (a, b) =>
        b.score - a.score || Number(b.item.generic) - Number(a.item.generic) || a.index - b.index,
    )
    .map((r) => r.item);
}

// ---------------------------------------------------------------------------
// Open Food Facts (barcode lookups)
// ---------------------------------------------------------------------------

export type OffProduct = {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Converts an Open Food Facts product. Returns null without a name or calories. */
export function fromOpenFoodFacts(product: OffProduct, barcode: string): FoodItem | null {
  const nutriments = product.nutriments ?? {};
  const servingGrams = num(product.serving_quantity);

  // Prefer per-100 g values; fall back to per-serving values scaled up.
  const per100 = (key: string): number | null => {
    const direct = num(nutriments[`${key}_100g`]);
    if (direct != null) return direct;
    const perServing = num(nutriments[`${key}_serving`]);
    return perServing != null && servingGrams ? (perServing * 100) / servingGrams : null;
  };

  const kj = per100('energy');
  const calories = per100('energy-kcal') ?? (kj != null ? kj / 4.184 : null);
  const name = product.product_name?.trim() || product.generic_name?.trim();
  if (calories == null || !name) return null;

  const servings: ServingOption[] = [];
  if (servingGrams && servingGrams > 0) {
    const text = product.serving_size?.trim();
    servings.push({
      label: text
        ? servingLabel(`1 serving, ${text}`, servingGrams)
        : servingLabel('1 serving', servingGrams),
      grams: servingGrams,
    });
  }

  const brand = product.brands?.split(',')[0]?.trim() || null;
  const round = (n: number | null) => (n == null ? null : round1(n));
  return {
    key: `open_food_facts:${barcode}`,
    source: 'open_food_facts',
    sourceId: barcode,
    name,
    brand,
    generic: false,
    per100g: {
      calories: round1(calories),
      protein: round(per100('proteins')),
      carbs: round(per100('carbohydrates')),
      fat: round(per100('fat')),
      micros: microsFromOpenFoodFacts(nutriments, servingGrams),
    },
    servings: withStandardServings(servings),
  };
}
