import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/database';
import type { Practice, PracticeReflection } from '@/types/models';

export type PracticeWithReflection = Practice & {
  practice_reflections: PracticeReflection | null;
};

export type PracticeInput = Pick<
  TablesInsert<'practices'>,
  | 'practice_date'
  | 'duration_minutes'
  | 'intensity'
  | 'pre_weight'
  | 'post_weight'
  | 'notes'
  | 'fluid_during_ml'
>;

export type HydrationLog = Tables<'hydration_logs'>;

export type DrinkInput = Pick<
  TablesInsert<'hydration_logs'>,
  'practice_id' | 'name' | 'volume_ml' | 'sodium_mg' | 'potassium_mg'
>;

export type ReflectionInput = Pick<
  TablesInsert<'practice_reflections'>,
  'went_well' | 'to_improve' | 'focus_next' | 'energy'
>;

const PRACTICE_SELECT = '*, practice_reflections(*)';

/** Newest first. RLS limits rows to the signed-in user. */
export async function fetchPractices(): Promise<PracticeWithReflection[]> {
  const { data, error } = await supabase
    .from('practices')
    .select(PRACTICE_SELECT)
    .order('practice_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPractice(input: PracticeInput): Promise<Practice> {
  const { data, error } = await supabase.from('practices').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updatePractice(id: string, changes: PracticeInput): Promise<Practice> {
  const { data, error } = await supabase
    .from('practices')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Also deletes the reflection (ON DELETE CASCADE). */
export async function deletePractice(id: string): Promise<void> {
  const { error } = await supabase.from('practices').delete().eq('id', id);
  if (error) throw error;
}

/** Creates or replaces the single reflection for a practice. */
export async function saveReflection(
  practiceId: string,
  input: ReflectionInput,
): Promise<PracticeReflection> {
  const { data, error } = await supabase
    .from('practice_reflections')
    .upsert({ practice_id: practiceId, ...input }, { onConflict: 'practice_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Drinks logged after one practice, oldest first. */
export async function fetchHydrationLogs(practiceId: string): Promise<HydrationLog[]> {
  const { data, error } = await supabase
    .from('hydration_logs')
    .select('*')
    .eq('practice_id', practiceId)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createHydrationLog(input: DrinkInput): Promise<HydrationLog> {
  const { data, error } = await supabase.from('hydration_logs').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function deleteHydrationLog(id: string): Promise<void> {
  const { error } = await supabase.from('hydration_logs').delete().eq('id', id);
  if (error) throw error;
}
