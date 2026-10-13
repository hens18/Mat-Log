import { startOfWeek } from '@/features/weigh-ins/trend';
import { fromDateKey } from '@/utils/dates';

type PracticeLike = {
  practice_date: string;
  duration_minutes: number | null;
  weight_lost: number | null;
};

export type PracticeSummary = {
  thisWeekCount: number;
  thisWeekMinutes: number;
  /** Average weight lost over the most recent practices that have both weights. */
  averageWeightLost: number | null;
  averageSampleSize: number;
  mostLost: { value: number; date: Date } | null;
};

export const AVERAGE_WINDOW = 10;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Weekly totals (weeks start Monday) and weight-loss stats for the practice list. */
export function summarizePractices(
  practices: readonly PracticeLike[],
  now: Date = new Date(),
): PracticeSummary {
  const weekStart = startOfWeek(now).getTime();
  const thisWeek = practices.filter((p) => fromDateKey(p.practice_date).getTime() >= weekStart);

  const withLoss = practices
    .filter((p): p is PracticeLike & { weight_lost: number } => p.weight_lost !== null)
    .sort((a, b) => b.practice_date.localeCompare(a.practice_date));
  const recent = withLoss.slice(0, AVERAGE_WINDOW);

  const most = withLoss.reduce<(PracticeLike & { weight_lost: number }) | null>(
    (best, p) => (!best || p.weight_lost > best.weight_lost ? p : best),
    null,
  );

  return {
    thisWeekCount: thisWeek.length,
    thisWeekMinutes: thisWeek.reduce((sum, p) => sum + (p.duration_minutes ?? 0), 0),
    averageWeightLost: recent.length
      ? round1(recent.reduce((sum, p) => sum + p.weight_lost, 0) / recent.length)
      : null,
    averageSampleSize: recent.length,
    mostLost: most ? { value: most.weight_lost, date: fromDateKey(most.practice_date) } : null,
  };
}

/** Parses practice length in minutes; empty means "not recorded". */
export function parseDuration(input: string): number | null | 'invalid' {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  const minutes = Number(trimmed);
  return minutes > 0 && minutes <= 600 ? minutes : 'invalid';
}
