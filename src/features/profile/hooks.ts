import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { TablesUpdate } from '@/types/database';
import type { WeightUnit } from '@/types/models';

const profileKey = (userId: string) => ['profile', userId] as const;

export type ProfileChanges = Pick<
  TablesUpdate<'profiles'>,
  'display_name' | 'weight_unit' | 'weight_class' | 'goal_weight'
>;

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: profileKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: ProfileChanges) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (profile) => queryClient.setQueryData(profileKey(userId), profile),
  });
}

/** The user's preferred unit, defaulting to lb while the profile loads. */
export function useWeightUnit(): WeightUnit {
  return useProfile().data?.weight_unit ?? 'lb';
}
