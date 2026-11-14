// The coach's roster: each wrestler's latest weight against their class, the
// next competition and the pace it needs, and who needs attention. Pure
// functions, no React.

import {
  daysUntil,
  nextCompetition,
  weighInDayKey,
  weightPlan,
  type Competition,
  type WeightPlan,
} from '@/features/competitions/countdown';
import type { Practice, WeighIn, WeightUnit } from '@/types/models';
import { toDateKey } from '@/utils/dates';

/**
 * A row from the team_roster() function. Written out by hand because the
 * generated function types mark every column non-null, but display name,
 * weight class, and goal can all be empty.
 */
export type RosterMember = {
  user_id: string;
  display_name: string | null;
  weight_unit: WeightUnit;
  weight_class: number | null;
  goal_weight: number | null;
  joined_at: string;
};

/** No weigh-in for this many days (or ever) gets flagged. */
export const STALE_AFTER_DAYS = 3;

export type RosterFlag = 'tooFast' | 'noRecentWeighIn' | 'noWeightClass';

export type RosterRow = {
  userId: string;
  name: string;
  unit: WeightUnit;
  weightClass: number | null;
  latest: { weight: number; recordedAt: string } | null;
  /** Whole days since the latest weigh-in, or null if there isn't one. */
  daysSinceWeighIn: number | null;
  /** Latest weight minus the weight about a week ago, when both exist. */
  weekChange: number | null;
  next: { name: string; days: number } | null;
  plan: WeightPlan;
  practicesThisWeek: number;
  flags: RosterFlag[];
};

export type RosterSummary = {
  athletes: number;
  onWeight: number;
  onPace: number;
  tooFast: number;
  stale: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function buildRoster(
  data: {
    members: readonly RosterMember[];
    weighIns: readonly WeighIn[];
    competitions: readonly Competition[];
    practices: readonly Practice[];
  },
  now: Date = new Date(),
): RosterRow[] {
  const today = startOfDay(now);
  const weekAgoKey = toDateKey(new Date(today.getTime() - 6 * DAY_MS));

  return data.members.map((member) => {
    const mine = data.weighIns
      .filter((w) => w.user_id === member.user_id)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const last = mine.at(-1);
    const latest = last ? { weight: last.weight, recordedAt: last.recorded_at } : null;
    const daysSinceWeighIn = last
      ? Math.round((today.getTime() - startOfDay(new Date(last.recorded_at)).getTime()) / DAY_MS)
      : null;

    // The last weigh-in on or before the day a week ago.
    const weekAgoCutoff = today.getTime() - 6 * DAY_MS;
    const before = mine.filter(
      (w) => startOfDay(new Date(w.recorded_at)).getTime() <= weekAgoCutoff,
    );
    const weekChange = last && before.length ? round1(last.weight - before.at(-1)!.weight) : null;

    const competition = nextCompetition(
      data.competitions.filter((c) => c.user_id === member.user_id),
      now,
    );
    const days = competition ? Math.max(0, daysUntil(weighInDayKey(competition), now)) : 0;
    const weightClass = competition?.weight_class ?? member.weight_class;
    const plan = weightPlan({ currentWeight: latest?.weight ?? null, weightClass, days });

    const flags: RosterFlag[] = [];
    if (plan.status === 'tooFast') flags.push('tooFast');
    if (daysSinceWeighIn === null || daysSinceWeighIn >= STALE_AFTER_DAYS) {
      flags.push('noRecentWeighIn');
    }
    if (!weightClass) flags.push('noWeightClass');

    return {
      userId: member.user_id,
      name: member.display_name?.trim() || 'Unnamed wrestler',
      unit: member.weight_unit,
      weightClass,
      latest,
      daysSinceWeighIn,
      weekChange,
      next: competition ? { name: competition.name, days } : null,
      plan,
      practicesThisWeek: data.practices.filter(
        (p) => p.user_id === member.user_id && p.practice_date >= weekAgoKey,
      ).length,
      flags,
    };
  });
}

/** Lower sorts first: wrestlers who need the coach's attention lead the list. */
function attention(row: RosterRow): number {
  if (row.flags.includes('tooFast')) return 0;
  if (row.flags.includes('noRecentWeighIn')) return 1;
  if (row.plan.status === 'onPace') return 2;
  if (row.flags.includes('noWeightClass')) return 3;
  return 4;
}

export type RosterSort = 'attention' | 'name' | 'toLose';

export function sortRoster(rows: readonly RosterRow[], sort: RosterSort): RosterRow[] {
  const toLose = (r: RosterRow) =>
    r.plan.status === 'onPace' || r.plan.status === 'tooFast'
      ? r.plan.toLose
      : r.plan.status === 'onWeight'
        ? -r.plan.margin
        : Number.NEGATIVE_INFINITY;
  return [...rows].sort((a, b) => {
    if (sort === 'toLose') return toLose(b) - toLose(a) || a.name.localeCompare(b.name);
    if (sort === 'attention') {
      return (
        attention(a) - attention(b) ||
        (a.next?.days ?? Infinity) - (b.next?.days ?? Infinity) ||
        a.name.localeCompare(b.name)
      );
    }
    return a.name.localeCompare(b.name);
  });
}

export function summarizeRoster(rows: readonly RosterRow[]): RosterSummary {
  return {
    athletes: rows.length,
    onWeight: rows.filter((r) => r.plan.status === 'onWeight').length,
    onPace: rows.filter((r) => r.plan.status === 'onPace').length,
    tooFast: rows.filter((r) => r.flags.includes('tooFast')).length,
    stale: rows.filter((r) => r.flags.includes('noRecentWeighIn')).length,
  };
}

/** "Today", "Yesterday", or "4 days ago". */
export function lastWeighInLabel(days: number | null): string {
  if (days === null) return 'No weigh-ins yet';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/** Codes are shown as ABCD-EFGH to make them easier to read out. */
export function formatJoinCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Matches the database's normalize_join_code: uppercase, letters and digits only. */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
