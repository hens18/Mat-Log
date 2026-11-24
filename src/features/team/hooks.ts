import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

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

function rosterQuery(userId: string, teamId: string) {
  return {
    queryKey: rosterKey(userId, teamId),
    queryFn: async () => {
      const members = await fetchRoster(teamId);
      const data = await fetchTeamData(members.map((m) => m.user_id));
      return { members, ...data };
    },
  };
}

/** Roster members plus their recent training data, for one team. */
export function useRoster(teamId: string | undefined) {
  const userId = useUserId();
  return useQuery({ ...rosterQuery(userId, teamId ?? ''), enabled: !!teamId });
}

/**
 * The team (and its roster) that an athlete belongs to, for the athlete screen.
 * Uses the team from the link when there is one; otherwise, as when the screen
 * is opened from a bookmark or shared link, searches the coach's own teams.
 */
export function useAthleteTeam(athleteId: string, teamFromLink: string | undefined) {
  const userId = useUserId();
  const coached = useCoachedTeams();
  const candidates = teamFromLink ? [teamFromLink] : (coached.data ?? []).map((t) => t.id);
  const rosters = useQueries({ queries: candidates.map((id) => rosterQuery(userId, id)) });
  const index = rosters.findIndex((r) => r.data?.members.some((m) => m.user_id === athleteId));
  return {
    teamId: index >= 0 ? candidates[index] : undefined,
    roster: index >= 0 ? rosters[index].data : undefined,
    isPending:
      index < 0 && ((!teamFromLink && coached.isPending) || rosters.some((r) => r.isPending)),
    error: coached.error ?? rosters.find((r) => r.error)?.error ?? null,
  };
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
