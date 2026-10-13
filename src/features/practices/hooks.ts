import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import {
  createPractice,
  deletePractice,
  fetchPractices,
  saveReflection,
  updatePractice,
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
