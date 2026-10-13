import { Platform } from 'react-native';

import { foodSearchConfig } from '@/lib/env';

import {
  fromOpenFoodFacts,
  fromUsda,
  genericFirst,
  type FoodItem,
  type UsdaFood,
} from './foodItem';

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const PAGE_SIZE = 25;

export type FoodDatabaseErrorCode = 'rate_limited' | 'bad_key' | 'network';

export class FoodDatabaseError extends Error {
  constructor(
    readonly code: FoodDatabaseErrorCode,
    message: string,
  ) {
    super(message);
  }
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new FoodDatabaseError('network', 'Check your connection and try again.');
  }
}

/** Searches USDA FoodData Central: generic reference foods plus branded products. */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    api_key: foodSearchConfig.usdaApiKey,
    query,
    pageSize: String(PAGE_SIZE),
    dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded',
  });
  const response = await request(`${USDA_SEARCH_URL}?${params}`, { signal });

  if (response.status === 429) {
    throw new FoodDatabaseError(
      'rate_limited',
      foodSearchConfig.usingDemoKey
        ? 'The shared demo key is out of searches for this hour. Add your own free USDA key to keep searching.'
        : 'Too many searches right now. Wait a minute and try again.',
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new FoodDatabaseError(
      'bad_key',
      'The USDA API key was rejected. Check EXPO_PUBLIC_USDA_API_KEY.',
    );
  }
  if (!response.ok) {
    throw new FoodDatabaseError('network', `Food search failed (${response.status}). Try again.`);
  }

  const body = (await response.json()) as { foods?: UsdaFood[] };
  const items = (body.foods ?? []).map(fromUsda).filter((item): item is FoodItem => item !== null);
  return genericFirst(items);
}

/** Looks up a packaged food by barcode in Open Food Facts. Null when not found. */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const fields = 'code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity';
  const response = await request(
    `${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}?fields=${fields}`,
    {
      // Open Food Facts asks apps to identify themselves. Browsers don't allow
      // setting User-Agent, so only send it from the native apps.
      headers: Platform.OS === 'web' ? undefined : { 'User-Agent': 'MatLog/1.0 (mobile app)' },
    },
  );
  if (response.status === 404) return null;
  if (response.status === 429) {
    throw new FoodDatabaseError(
      'rate_limited',
      'Too many scans right now. Wait a minute and try again.',
    );
  }
  if (!response.ok) {
    throw new FoodDatabaseError(
      'network',
      `Barcode lookup failed (${response.status}). Try again.`,
    );
  }
  const body = (await response.json()) as {
    status?: number;
    product?: Parameters<typeof fromOpenFoodFacts>[0];
  };
  if (body.status === 0 || !body.product) return null;
  return fromOpenFoodFacts(body.product, barcode);
}
