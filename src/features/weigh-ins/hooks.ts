import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import { createWeighIn, deleteWeighIn, fetchWeighIns, updateWeighIn, type NewWeighIn } from './api';

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

export function useUpdateWeighIn() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: NewWeighIn }) =>
      updateWeighIn(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weighInsKey(userId) }),
  });
}

/** A weigh-in from the cached list (the last 12 months), or undefined. */
export function useWeighIn(id: string) {
  const query = useWeighIns();
  return { ...query, weighIn: query.data?.find((w) => w.id === id) };
}

export function useDeleteWeighIn() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWeighIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weighInsKey(userId) }),
  });
}
