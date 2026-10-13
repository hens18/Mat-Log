import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database';
import { toDateKey } from '@/utils/dates';

import type { FoodLog } from './summary';

/** How far back to load: enough for the date strip and a useful recent-foods list. */
export const HISTORY_DAYS = 60;

export type FoodInput = Pick<
  TablesInsert<'food_logs'>,
  'logged_on' | 'meal' | 'name' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
>;

/** The last HISTORY_DAYS of entries, newest first. RLS limits rows to the signed-in user. */
export async function fetchFoodLogs(now: Date = new Date()): Promise<FoodLog[]> {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - HISTORY_DAYS);
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .gte('logged_on', toDateKey(since))
    .order('logged_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data;
}

export async function createFoodLog(input: FoodInput): Promise<FoodLog> {
  const { data, error } = await supabase.from('food_logs').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateFoodLog(id: string, changes: FoodInput): Promise<FoodLog> {
  const { data, error } = await supabase
    .from('food_logs')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}
