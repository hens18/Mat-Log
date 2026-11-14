import type { Competition } from '@/features/competitions/countdown';
import { db } from '@/lib/db';
import type { Tables } from '@/types/database';
import type { Practice, WeighIn } from '@/types/models';
import { toDateKey } from '@/utils/dates';

import type { RosterMember } from './roster';

export type Team = Tables<'teams'>;
export type Membership = {
  team_id: string;
  team_name: string;
  coach_name: string | null;
  joined_at: string;
};
export type TeamPreview = { team_id: string; team_name: string; coach_name: string | null };

const daysAgoKey = (days: number) => {
  const d = new Date();
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - days));
};

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

export async function fetchCoachedTeams(userId: string): Promise<Team[]> {
  const { data, error } = await db
    .from('teams')
    .select('*')
    .eq('coach_id', userId)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function createTeam(name: string): Promise<Team> {
  const { data, error } = await db.from('teams').insert({ name }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await db.from('teams').delete().eq('id', teamId);
  if (error) throw error;
}

export async function regenerateJoinCode(teamId: string): Promise<string> {
  const { data, error } = await db.rpc('regenerate_join_code', { team: teamId });
  if (error) throw error;
  return data;
}

export async function fetchRoster(teamId: string): Promise<RosterMember[]> {
  const { data, error } = await db.rpc('team_roster', { team: teamId });
  if (error) throw error;
  return data as unknown as RosterMember[];
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await db
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);
  if (error) throw error;
}

export type TeamData = {
  weighIns: WeighIn[];
  competitions: Competition[];
  practices: Practice[];
};

/**
 * Recent training data for a set of athletes. RLS only returns rows for
 * athletes on a team the caller coaches.
 */
export async function fetchTeamData(
  userIds: string[],
  window: { weighInDays: number; practiceDays: number } = { weighInDays: 30, practiceDays: 14 },
): Promise<TeamData> {
  if (userIds.length === 0) return { weighIns: [], competitions: [], practices: [] };
  const [weighIns, competitions, practices] = await Promise.all([
    db
      .from('weigh_ins')
      .select('*')
      .in('user_id', userIds)
      .gte('recorded_at', new Date(Date.now() - window.weighInDays * 86400000).toISOString())
      .order('recorded_at')
      .limit(5000),
    db
      .from('competitions')
      .select('*')
      .in('user_id', userIds)
      .gte('starts_on', daysAgoKey(1))
      .order('starts_on'),
    db
      .from('practices')
      .select('*')
      .in('user_id', userIds)
      .gte('practice_date', daysAgoKey(window.practiceDays))
      .order('practice_date', { ascending: false }),
  ]);
  for (const result of [weighIns, competitions, practices]) {
    if (result.error) throw result.error;
  }
  return {
    weighIns: weighIns.data ?? [],
    competitions: competitions.data ?? [],
    practices: practices.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Wrestlers
// ---------------------------------------------------------------------------

export async function fetchMyTeams(): Promise<Membership[]> {
  const { data, error } = await db.rpc('my_teams');
  if (error) throw error;
  return data as unknown as Membership[];
}

/** The team behind a code, or null if no team has it. */
export async function previewTeam(code: string): Promise<TeamPreview | null> {
  const { data, error } = await db.rpc('preview_team', { code });
  if (error) throw error;
  return ((data as unknown as TeamPreview[]) ?? [])[0] ?? null;
}

export async function joinTeam(code: string): Promise<{ team_id: string; team_name: string }> {
  const { data, error } = await db.rpc('join_team', { code });
  if (error) throw error;
  return (data as unknown as { team_id: string; team_name: string }[])[0];
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  await removeMember(teamId, userId);
}
