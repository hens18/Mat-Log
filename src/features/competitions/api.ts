import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database';

import type { Competition } from './countdown';

export type CompetitionInput = Pick<
  TablesInsert<'competitions'>,
  'name' | 'starts_on' | 'weigh_in_at' | 'weight_class' | 'location' | 'notes'
>;

/** Every competition, soonest first. RLS limits rows to the signed-in user. */
export async function fetchCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('starts_on', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCompetition(input: CompetitionInput): Promise<Competition> {
  const { data, error } = await supabase.from('competitions').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCompetition(
  id: string,
  changes: CompetitionInput,
): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompetition(id: string): Promise<void> {
  const { error } = await supabase.from('competitions').delete().eq('id', id);
  if (error) throw error;
}
