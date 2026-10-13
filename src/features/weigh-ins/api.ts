import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/database';
import type { WeighIn } from '@/types/models';

import { rangeStart } from './trend';

// Supabase caps responses at 1000 rows by default, so read in pages.
const PAGE_SIZE = 1000;

/**
 * Every weigh-in the dashboard can show: the last 12 months, oldest first.
 * RLS limits the rows to the signed-in user, so no user filter is needed.
 */
export async function fetchWeighIns(now: Date = new Date()): Promise<WeighIn[]> {
  const since = rangeStart('month', now).toISOString();
  const rows: WeighIn[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('weigh_ins')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export type NewWeighIn = Pick<
  TablesInsert<'weigh_ins'>,
  'weight' | 'kind' | 'note' | 'recorded_at'
>;

export async function createWeighIn(input: NewWeighIn): Promise<WeighIn> {
  const { data, error } = await supabase.from('weigh_ins').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateWeighIn(
  id: string,
  changes: Pick<TablesUpdate<'weigh_ins'>, 'weight' | 'kind' | 'note' | 'recorded_at'>,
): Promise<WeighIn> {
  const { data, error } = await supabase
    .from('weigh_ins')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWeighIn(id: string): Promise<void> {
  const { error } = await supabase.from('weigh_ins').delete().eq('id', id);
  if (error) throw error;
}
