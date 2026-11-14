import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { FoodDatabaseError, searchFoods } from './foodDatabase';
import type { FoodItem } from './foodItem';

const MIN_QUERY_LENGTH = 2;

/** `value`, but only after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useFoodSearch(rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 350);
  const enabled = query.length >= MIN_QUERY_LENGTH;
  const result = useQuery({
    queryKey: ['food-search', query.toLowerCase()],
    queryFn: ({ signal }) => searchFoods(query, signal),
    enabled,
    // Food data barely changes; cache searches for the session.
    staleTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (count, error) =>
      !(error instanceof FoodDatabaseError && error.code !== 'network') && count < 2,
  });
  return { ...result, enabled, pending: enabled && rawQuery.trim() !== query };
}

const foodItemKey = (key: string) => ['food-item', key] as const;

/**
 * Remembers a picked food so the detail screen can read it by key instead
 * of passing the whole object through route params.
 */
export function rememberFoodItem(queryClient: QueryClient, item: FoodItem) {
  queryClient.setQueryData(foodItemKey(item.key), item);
}

export function useRememberedFoodItem(key: string | undefined): FoodItem | undefined {
  const queryClient = useQueryClient();
  return key ? queryClient.getQueryData<FoodItem>(foodItemKey(key)) : undefined;
}
