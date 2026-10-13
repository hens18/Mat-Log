import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import { createWeighIn, deleteWeighIn, fetchWeighIns, type NewWeighIn } from './api';

const weighInsKey = (userId: string) => ['weigh-ins', userId] as const;

export function useWeighIns() {
  const userId = useUserId();
  return useQuery({
    queryKey: weighInsKey(userId),
    queryFn: () => fetchWeighIns(),
  });
}

export function useCreateWeighIn() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewWeighIn) => createWeighIn(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weighInsKey(userId) }),
  });
}

export function useDeleteWeighIn() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWeighIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weighInsKey(userId) }),
  });
}
