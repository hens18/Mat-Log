import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import { CREATE_WEIGH_IN_KEY } from '@/lib/queryClient';
import type { WeighIn } from '@/types/models';

import { deleteWeighIn, fetchWeighIns, updateWeighIn, type NewWeighIn } from './api';

const weighInsKey = (userId: string) => ['weigh-ins', userId] as const;

export function useWeighIns() {
  const userId = useUserId();
  return useQuery({
    queryKey: weighInsKey(userId),
    queryFn: () => fetchWeighIns(),
  });
}

/**
 * Logs a weigh-in. Works offline: it shows up in the list right away and is
 * sent when the connection comes back (the function is registered in
 * src/lib/queryClient.ts so queued weigh-ins survive an app restart).
 */
export function useCreateWeighIn() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation<WeighIn, Error, NewWeighIn, { previous?: WeighIn[] }>({
    mutationKey: CREATE_WEIGH_IN_KEY,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: weighInsKey(userId) });
      const previous = queryClient.getQueryData<WeighIn[]>(weighInsKey(userId));
      const now = new Date().toISOString();
      const pending: WeighIn = {
        id: `pending-${Date.now()}`,
        user_id: userId,
        weight: input.weight,
        kind: input.kind ?? 'morning',
        note: input.note ?? null,
        recorded_at: input.recorded_at ?? now,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<WeighIn[]>(weighInsKey(userId), (list = []) =>
        [...list, pending].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(weighInsKey(userId), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: weighInsKey(userId) }),
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
