import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import {
  createCompetition,
  deleteCompetition,
  fetchCompetitions,
  updateCompetition,
  type CompetitionInput,
} from './api';

export const competitionsKey = (userId: string) => ['competitions', userId] as const;

export function useCompetitions() {
  const userId = useUserId();
  return useQuery({ queryKey: competitionsKey(userId), queryFn: fetchCompetitions });
}

export function useCompetition(id: string) {
  const query = useCompetitions();
  return { ...query, competition: query.data?.find((c) => c.id === id) };
}

function useInvalidate() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: competitionsKey(userId) });
}

export function useSaveCompetition() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CompetitionInput }) =>
      id ? updateCompetition(id, input) : createCompetition(input),
    onSuccess: invalidate,
  });
}

export function useDeleteCompetition() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deleteCompetition, onSuccess: invalidate });
}
