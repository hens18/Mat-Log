import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import type { FoodInput } from './api';
import type { FoodItem } from './foodItem';
import type { SavedMealItem } from './library';
import {
  addFavorite,
  createCustomFood,
  createSavedMeal,
  deleteCustomFood,
  deleteSavedMeal,
  fetchCustomFoods,
  fetchFavorites,
  fetchSavedMeals,
  logFoods,
  removeFavorite,
  updateCustomFood,
  type CustomFoodInput,
} from './libraryApi';

const customKey = (userId: string) => ['custom-foods', userId] as const;
const favoritesKey = (userId: string) => ['favorite-foods', userId] as const;
const mealsKey = (userId: string) => ['saved-meals', userId] as const;
const foodLogsKey = (userId: string) => ['food-logs', userId] as const;

export function useCustomFoods() {
  const userId = useUserId();
  return useQuery({ queryKey: customKey(userId), queryFn: fetchCustomFoods });
}

export function useSaveCustomFood() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CustomFoodInput }) =>
      id ? updateCustomFood(id, input) : createCustomFood(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customKey(userId) }),
  });
}

export function useDeleteCustomFood() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomFood,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customKey(userId) }),
  });
}

export function useFavorites() {
  const userId = useUserId();
  return useQuery({ queryKey: favoritesKey(userId), queryFn: fetchFavorites });
}

export function useIsFavorite(foodKey: string): boolean {
  return useFavorites().data?.some((f) => f.food_key === foodKey) ?? false;
}

export function useToggleFavorite() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, favorite }: { item: FoodItem; favorite: boolean }) => {
      if (favorite) await addFavorite(item);
      else await removeFavorite(item.key);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritesKey(userId) }),
  });
}

export function useSavedMeals() {
  const userId = useUserId();
  return useQuery({ queryKey: mealsKey(userId), queryFn: fetchSavedMeals });
}

export function useCreateSavedMeal() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, items }: { name: string; items: SavedMealItem[] }) =>
      createSavedMeal(name, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mealsKey(userId) }),
  });
}

export function useDeleteSavedMeal() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSavedMeal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mealsKey(userId) }),
  });
}

export function useLogFoods() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: FoodInput[]) => logFoods(inputs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodLogsKey(userId) }),
  });
}
