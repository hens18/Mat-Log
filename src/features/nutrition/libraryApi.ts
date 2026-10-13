import { supabase } from '@/lib/supabase';
import type { Json, TablesInsert } from '@/types/database';

import type { FoodInput } from './api';
import type { FoodItem } from './foodItem';
import type { CustomFood, FavoriteFood, SavedMeal, SavedMealItem } from './library';

export type CustomFoodInput = Pick<
  TablesInsert<'custom_foods'>,
  | 'name'
  | 'brand'
  | 'serving_label'
  | 'serving_grams'
  | 'calories'
  | 'protein_g'
  | 'carbs_g'
  | 'fat_g'
  | 'micros'
>;

// RLS limits every query here to the signed-in user's rows.

export async function fetchCustomFoods(): Promise<CustomFood[]> {
  const { data, error } = await supabase.from('custom_foods').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createCustomFood(input: CustomFoodInput): Promise<CustomFood> {
  const { data, error } = await supabase.from('custom_foods').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomFood(id: string, changes: CustomFoodInput): Promise<CustomFood> {
  const { data, error } = await supabase
    .from('custom_foods')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCustomFood(id: string): Promise<void> {
  const { error } = await supabase.from('custom_foods').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchFavorites(): Promise<FavoriteFood[]> {
  const { data, error } = await supabase
    .from('favorite_foods')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Stars a food, or refreshes its snapshot if it's already starred. */
export async function addFavorite(item: FoodItem): Promise<FavoriteFood> {
  const { data, error } = await supabase
    .from('favorite_foods')
    .upsert(
      { food_key: item.key, item: item as unknown as NonNullable<Json> },
      { onConflict: 'user_id,food_key' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeFavorite(foodKey: string): Promise<void> {
  const { error } = await supabase.from('favorite_foods').delete().eq('food_key', foodKey);
  if (error) throw error;
}

export async function fetchSavedMeals(): Promise<SavedMeal[]> {
  const { data, error } = await supabase.from('saved_meals').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createSavedMeal(name: string, items: SavedMealItem[]): Promise<SavedMeal> {
  const { data, error } = await supabase
    .from('saved_meals')
    .insert({ name, items: items as unknown as NonNullable<Json> })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const { error } = await supabase.from('saved_meals').delete().eq('id', id);
  if (error) throw error;
}

/** Logs every food in a meal with one insert, so it either all lands or none of it does. */
export async function logFoods(inputs: FoodInput[]): Promise<void> {
  const { error } = await supabase.from('food_logs').insert(inputs);
  if (error) throw error;
}
