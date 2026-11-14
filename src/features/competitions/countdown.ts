// The countdown to the next competition and what it takes to make weight.
// Pure functions, no React.
//
// High school weight management rules (NFHS) cap weight loss at 1.5% of body
// weight per week, so any plan faster than that is flagged rather than shown
// as a normal target.

import type { Tables } from '@/types/database';
import { fromDateKey, toDateKey } from '@/utils/dates';

export type Competition = Tables<'competitions'>;

/** NFHS maximum weekly loss, as a share of body weight. */
export const MAX_WEEKLY_LOSS_PERCENT = 1.5;
/**
 * Short windows can pass the weekly rule while still needing a big one-day
 * drop (1.8 lb the night before is within 1.5% for the week but is a water
 * cut), so more than this share of body weight in a single day is flagged too.
 */
export const MAX_DAILY_LOSS_PERCENT = 1;

const DAY_MS = 24 * 60 * 60 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The day weigh-ins happen: the weigh-in time's date if set, else the event date. */
export function weighInDayKey(competition: Pick<Competition, 'starts_on' | 'weigh_in_at'>): string {
  return competition.weigh_in_at
    ? toDateKey(new Date(competition.weigh_in_at))
    : competition.starts_on;
}

/** Whole calendar days from today until a date key (0 = today, negative = past). */
export function daysUntil(dateKey: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((fromDateKey(dateKey).getTime() - today.getTime()) / DAY_MS);
}

/** The soonest competition whose weigh-in day is today or later. */
export function nextCompetition<T extends Pick<Competition, 'starts_on' | 'weigh_in_at'>>(
  competitions: readonly T[],
  now: Date = new Date(),
): T | null {
  const upcoming = competitions
    .filter((c) => daysUntil(weighInDayKey(c), now) >= 0)
    .sort((a, b) => weighInDayKey(a).localeCompare(weighInDayKey(b)));
  return upcoming[0] ?? null;
}

export type WeightPlan =
  | { status: 'noWeightClass' }
  | { status: 'noWeight' }
  | { status: 'onWeight'; margin: number }
  | {
      status: 'onPace' | 'tooFast';
      toLose: number;
      perDay: number;
      perWeek: number;
      /** Loss over the next week as a share of current body weight. */
      percentPerWeek: number;
      /** Fastest weekly loss the rules allow at this weight. */
      maxPerWeek: number;
      /** Which limit a 'tooFast' plan breaks. */
      reason: 'weekly' | 'daily' | null;
    };

/**
 * What it takes to be at or under the weight class by weigh-ins. Days count
 * from today to the weigh-in day, with weigh-in day itself counted as one day
 * so a same-day plan still divides sensibly.
 */
export function weightPlan(input: {
  currentWeight: number | null;
  weightClass: number | null;
  days: number;
}): WeightPlan {
  const { currentWeight, weightClass } = input;
  if (!weightClass) return { status: 'noWeightClass' };
  if (currentWeight == null) return { status: 'noWeight' };

  const toLose = round1(currentWeight - weightClass);
  if (toLose <= 0) return { status: 'onWeight', margin: Math.abs(toLose) };

  const days = Math.max(1, input.days);
  const perDay = toLose / days;
  // What actually comes off in the next 7 days: never more than what's left.
  const perWeek = Math.min(toLose, perDay * 7);
  const percentPerWeek = (perWeek * 100) / currentWeight;
  const reason =
    percentPerWeek > MAX_WEEKLY_LOSS_PERCENT
      ? 'weekly'
      : (perDay * 100) / currentWeight > MAX_DAILY_LOSS_PERCENT
        ? 'daily'
        : null;
  return {
    status: reason ? 'tooFast' : 'onPace',
    reason,
    toLose,
    perDay: round2(perDay),
    perWeek: round1(perWeek),
    percentPerWeek: round1(percentPerWeek),
    maxPerWeek: round1((currentWeight * MAX_WEEKLY_LOSS_PERCENT) / 100),
  };
}

/** "Today", "Tomorrow", or "12 days". */
export function countdownLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}
