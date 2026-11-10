import { db } from '@/lib/db';
import type { TablesInsert } from '@/types/database';

import type { Competition } from './countdown';

export type CompetitionInput = Pick<
  TablesInsert<'competitions'>,
  'name' | 'starts_on' | 'weigh_in_at' | 'weight_class' | 'location' | 'notes'
>;

/** One user's competitions, soonest first. Filtered by user because coaches can read athletes' too. */
export async function fetchCompetitions(userId: string): Promise<Competition[]> {
  const { data, error } = await db
    .from('competitions')
    .select('*')
    .eq('user_id', userId)
    .order('starts_on', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCompetition(input: CompetitionInput): Promise<Competition> {
  const { data, error } = await db.from('competitions').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCompetition(
  id: string,
  changes: CompetitionInput,
): Promise<Competition> {
  const { data, error } = await db
    .from('competitions')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompetition(id: string): Promise<void> {
  const { error } = await db.from('competitions').delete().eq('id', id);
  if (error) throw error;
}
