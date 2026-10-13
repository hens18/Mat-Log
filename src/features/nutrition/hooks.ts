import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import { createFoodLog, deleteFoodLog, fetchFoodLogs, updateFoodLog, type FoodInput } from './api';

const foodKey = (userId: string) => ['food-logs', userId] as const;

export function useFoodLogs() {
  const userId = useUserId();
  return useQuery({ queryKey: foodKey(userId), queryFn: () => fetchFoodLogs() });
}

export function useFoodLog(id: string) {
  const query = useFoodLogs();
  return { ...query, entry: query.data?.find((e) => e.id === id) };
}

function useInvalidateFood() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: foodKey(userId) });
}

export function useCreateFoodLog() {
  const invalidate = useInvalidateFood();
  return useMutation({
    mutationFn: (input: FoodInput) => createFoodLog(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFoodLog() {
  const invalidate = useInvalidateFood();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: FoodInput }) => updateFoodLog(id, changes),
    onSuccess: invalidate,
  });
}

export function useDeleteFoodLog() {
  const invalidate = useInvalidateFood();
  return useMutation({ mutationFn: (id: string) => deleteFoodLog(id), onSuccess: invalidate });
}
