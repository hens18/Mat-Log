import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { WeightUnit } from '@/types/models';

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data;
    },
  });
}

/** The user's preferred unit, defaulting to lb while the profile loads. */
export function useWeightUnit(): WeightUnit {
  return useProfile().data?.weight_unit ?? 'lb';
}
