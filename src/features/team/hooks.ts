import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/features/auth/AuthProvider';

import {
  createTeam,
  deleteTeam,
  fetchCoachedTeams,
  fetchMyTeams,
  fetchRoster,
  fetchTeamData,
  joinTeam,
  leaveTeam,
  regenerateJoinCode,
  removeMember,
} from './api';

const coachedKey = (userId: string) => ['teams', 'coached', userId] as const;
const membershipsKey = (userId: string) => ['teams', 'mine', userId] as const;
const rosterKey = (userId: string, teamId: string) => ['teams', 'roster', userId, teamId] as const;

export function useCoachedTeams() {
  const userId = useUserId();
  return useQuery({ queryKey: coachedKey(userId), queryFn: () => fetchCoachedTeams(userId) });
}

export function useMyTeams() {
  const userId = useUserId();
  return useQuery({ queryKey: membershipsKey(userId), queryFn: fetchMyTeams });
}

/** Roster members plus their recent training data, for one team. */
export function useRoster(teamId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: rosterKey(userId, teamId ?? ''),
    enabled: !!teamId,
    queryFn: async () => {
      const members = await fetchRoster(teamId!);
      const data = await fetchTeamData(members.map((m) => m.user_id));
      return { members, ...data };
    },
  });
}

/** One athlete's longer history for the detail screen. */
export function useAthleteData(athleteId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['teams', 'athlete', userId, athleteId],
    queryFn: () => fetchTeamData([athleteId], { weighInDays: 90, practiceDays: 30 }),
  });
}

function useInvalidateTeams() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['teams'] });
}

export function useCreateTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({ mutationFn: createTeam, onSuccess: invalidate });
}

export function useDeleteTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({ mutationFn: deleteTeam, onSuccess: invalidate });
}

export function useRegenerateJoinCode() {
  const invalidate = useInvalidateTeams();
  return useMutation({ mutationFn: regenerateJoinCode, onSuccess: invalidate });
}

export function useRemoveMember() {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeMember(teamId, userId),
    onSuccess: invalidate,
  });
}

export function useJoinTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({ mutationFn: joinTeam, onSuccess: invalidate });
}

export function useLeaveTeam() {
  const userId = useUserId();
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (teamId: string) => leaveTeam(teamId, userId),
    onSuccess: invalidate,
  });
}
