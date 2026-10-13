import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import {
  createHydrationLog,
  createPractice,
  deleteHydrationLog,
  fetchHydrationLogs,
  deletePractice,
  fetchPractices,
  saveReflection,
  updatePractice,
  type DrinkInput,
  type PracticeInput,
  type ReflectionInput,
} from './api';

const practicesKey = (userId: string) => ['practices', userId] as const;

export function usePractices() {
  const userId = useUserId();
  return useQuery({
    queryKey: practicesKey(userId),
    queryFn: fetchPractices,
  });
}

export function usePractice(id: string) {
  const query = usePractices();
  return { ...query, practice: query.data?.find((p) => p.id === id) };
}

function useInvalidatePractices() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: practicesKey(userId) });
}

export function useCreatePractice() {
  const invalidate = useInvalidatePractices();
  return useMutation({
    mutationFn: (input: PracticeInput) => createPractice(input),
    onSuccess: invalidate,
  });
}

export function useUpdatePractice() {
  const invalidate = useInvalidatePractices();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: PracticeInput }) =>
      updatePractice(id, changes),
    onSuccess: invalidate,
  });
}

export function useDeletePractice() {
  const invalidate = useInvalidatePractices();
  return useMutation({
    mutationFn: (id: string) => deletePractice(id),
    onSuccess: invalidate,
  });
}

export function useSaveReflection() {
  const invalidate = useInvalidatePractices();
  return useMutation({
    mutationFn: ({ practiceId, input }: { practiceId: string; input: ReflectionInput }) =>
      saveReflection(practiceId, input),
    onSuccess: invalidate,
  });
}

const hydrationKey = (userId: string, practiceId: string) =>
  ['hydration-logs', userId, practiceId] as const;

export function useHydrationLogs(practiceId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: hydrationKey(userId, practiceId),
    queryFn: () => fetchHydrationLogs(practiceId),
  });
}

export function useLogDrink() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DrinkInput) => createHydrationLog(input),
    onSuccess: (log) =>
      queryClient.invalidateQueries({ queryKey: hydrationKey(userId, log.practice_id) }),
  });
}

export function useDeleteDrink(practiceId: string) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHydrationLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hydrationKey(userId, practiceId) }),
  });
}
