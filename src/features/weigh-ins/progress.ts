import { toDateKey } from '@/utils/dates';

import { roundWeight } from './trend';

/**
 * How far along the way from a starting weight to the goal, from 0 to 1.
 * Works whether the goal is below (cutting) or above (gaining) the start.
 */
export function goalProgress(start: number, current: number, goal: number): number {
  const total = start - goal;
  if (total === 0) return current === goal ? 1 : 0;
  const done = (start - current) / total;
  return Math.max(0, Math.min(1, done));
}

/** Pounds (or kg) still to go, always positive, rounded to 0.1. */
export function distanceToGoal(current: number, goal: number): number {
  return roundWeight(Math.abs(current - goal));
}

/**
 * Consecutive days with at least one weigh-in, ending today. If nothing has
 * been logged yet today, the streak still counts through yesterday so it
 * doesn't reset at midnight.
 */
export function weighInStreak(
  recordedAt: readonly (string | Date)[],
  now: Date = new Date(),
): number {
  const days = new Set(recordedAt.map((d) => toDateKey(new Date(d))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** The longest run of consecutive days with at least one weigh-in. */
export function longestStreak(recordedAt: readonly (string | Date)[]): number {
  const days = [...new Set(recordedAt.map((d) => toDateKey(new Date(d))))].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const next =
      previous && new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1);
    run = next && next.getTime() === date.getTime() ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}
