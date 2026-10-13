// The season summary: practices, mat time, weight, and consistency over a
// date range. Pure functions.

import type { Competition } from '@/features/competitions/countdown';
import { longestStreak } from '@/features/weigh-ins/progress';
import { startOfWeek } from '@/features/weigh-ins/trend';
import type { Practice, WeighIn } from '@/types/models';
import { fromDateKey, toDateKey } from '@/utils/dates';

export type SeasonRange = 'season' | '30d' | 'all';

/**
 * Wrestling seasons straddle the new year, so "this season" runs from
 * August 1 to July 31: from August on it's this year's season, before
 * August it's the one that started last year.
 */
export function rangeStartKey(range: SeasonRange, now: Date = new Date()): string | null {
  if (range === 'all') return null;
  if (range === '30d') {
    return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  }
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-08-01`;
}

export function seasonLabel(range: SeasonRange, now: Date = new Date()): string {
  if (range === 'all') return 'All time';
  if (range === '30d') return 'Last 30 days';
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(2)} season`;
}

export type SeasonSummary = {
  practices: number;
  matMinutes: number;
  /** Average weight lost per practice with both weights recorded. */
  averageLost: number | null;
  biggestLost: { amount: number; date: string } | null;
  weighIns: number;
  bestStreak: number;
  /** First weigh-in to last weigh-in in the range. */
  weightChange: { from: number; to: number; change: number } | null;
  /** The Monday-to-Sunday week with the most practice minutes. */
  bestWeek: { start: string; minutes: number; practices: number } | null;
  competitions: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarizeSeason(
  data: {
    practices: readonly Practice[];
    weighIns: readonly WeighIn[];
    competitions: readonly Competition[];
  },
  range: SeasonRange,
  now: Date = new Date(),
): SeasonSummary {
  const start = rangeStartKey(range, now);
  const todayKey = toDateKey(now);
  const inRange = (key: string) => (!start || key >= start) && key <= todayKey;

  const practices = data.practices.filter((p) => inRange(p.practice_date));
  const weighIns = data.weighIns
    .filter((w) => inRange(toDateKey(new Date(w.recorded_at))))
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

  const losses = practices.filter((p) => p.weight_lost != null);
  const biggest = losses.reduce<Practice | null>(
    (best, p) => (!best || p.weight_lost! > best.weight_lost! ? p : best),
    null,
  );

  const weeks = new Map<string, { minutes: number; practices: number }>();
  for (const p of practices) {
    const key = toDateKey(startOfWeek(fromDateKey(p.practice_date)));
    const week = weeks.get(key) ?? { minutes: 0, practices: 0 };
    week.minutes += p.duration_minutes ?? 0;
    week.practices += 1;
    weeks.set(key, week);
  }
  const bestWeek = [...weeks.entries()]
    .sort(
      ([a, x], [b, y]) => y.minutes - x.minutes || y.practices - x.practices || a.localeCompare(b),
    )
    .map(([key, w]) => ({ start: key, ...w }))[0];

  const first = weighIns[0];
  const last = weighIns.at(-1);

  return {
    practices: practices.length,
    matMinutes: practices.reduce((sum, p) => sum + (p.duration_minutes ?? 0), 0),
    averageLost: losses.length
      ? round1(losses.reduce((sum, p) => sum + p.weight_lost!, 0) / losses.length)
      : null,
    biggestLost: biggest ? { amount: biggest.weight_lost!, date: biggest.practice_date } : null,
    weighIns: weighIns.length,
    bestStreak: longestStreak(weighIns.map((w) => w.recorded_at)),
    weightChange:
      first && last && first !== last
        ? { from: first.weight, to: last.weight, change: round1(last.weight - first.weight) }
        : null,
    bestWeek: bestWeek && bestWeek.minutes > 0 ? bestWeek : null,
    competitions: data.competitions.filter((c) => inRange(c.starts_on)).length,
  };
}

/** "18.5 hrs" or "45 min". */
export function formatMatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hrs`;
}
