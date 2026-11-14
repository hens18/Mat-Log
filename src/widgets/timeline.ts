// What the home screen widget shows, as plain strings, for today and each day
// until weigh-ins. Pure functions; the widget itself can't import anything.

import {
  daysUntil,
  nextCompetition,
  weighInDayKey,
  weightPlan,
  type Competition,
} from '@/features/competitions/countdown';
import type { WeightUnit } from '@/types/models';
import { fromDateKey } from '@/utils/dates';
import { formatRate, formatWeight } from '@/utils/format';

export type WidgetTone = 'good' | 'warn' | 'bad' | 'muted';

export type CountdownWidgetProps = {
  /** False when there is no upcoming competition. */
  hasCompetition: boolean;
  name: string;
  dateLabel: string;
  days: string;
  daysLabel: string;
  weight: string;
  weightLabel: string;
  weightClass: string;
  difference: string;
  differenceLabel: string;
  plan: string;
  tone: WidgetTone;
};

export type WidgetInput = {
  competitions: readonly Competition[];
  latest: { weight: number; recordedAt: string } | null;
  profileWeightClass: number | null;
  unit: WeightUnit;
};

/** At most this many daily entries, so the timeline stays small. */
export const MAX_TIMELINE_DAYS = 30;

const EMPTY: CountdownWidgetProps = {
  hasCompetition: false,
  name: 'No competition',
  dateLabel: 'Add one in Mat Log',
  days: '--',
  daysLabel: 'days to go',
  weight: '--',
  weightLabel: 'Weight',
  weightClass: '--',
  difference: '--',
  differenceLabel: 'To lose',
  plan: 'Add your next competition to start the countdown.',
  tone: 'muted',
};

export function widgetProps(input: WidgetInput, now: Date = new Date()): CountdownWidgetProps {
  const competition = nextCompetition(input.competitions, now);
  if (!competition) {
    return input.latest
      ? { ...EMPTY, weight: formatWeight(input.latest.weight, input.unit) }
      : EMPTY;
  }

  const days = Math.max(0, daysUntil(weighInDayKey(competition), now));
  const weightClass = competition.weight_class ?? input.profileWeightClass;
  const plan = weightPlan({ currentWeight: input.latest?.weight ?? null, weightClass, days });
  const w = (n: number) => formatWeight(n, input.unit);

  const base = {
    hasCompetition: true,
    name: competition.name,
    dateLabel: fromDateKey(competition.starts_on).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    days: String(days),
    daysLabel: days === 0 ? 'weigh-ins today' : days === 1 ? 'day to go' : 'days to go',
    weight: input.latest ? w(input.latest.weight) : '--',
    weightLabel: 'Weight',
    weightClass: weightClass ? w(weightClass) : '--',
  };

  switch (plan.status) {
    case 'noWeightClass':
      return {
        ...base,
        difference: '--',
        differenceLabel: 'To lose',
        plan: 'Set a weight class in Mat Log.',
        tone: 'muted',
      };
    case 'noWeight':
      return {
        ...base,
        difference: '--',
        differenceLabel: 'To lose',
        plan: 'Log a weigh-in to see where you stand.',
        tone: 'muted',
      };
    case 'onWeight':
      return {
        ...base,
        difference: w(plan.margin),
        differenceLabel: 'Under by',
        plan: "You're on weight. Keep fueling.",
        tone: 'good',
      };
    case 'onPace':
      return {
        ...base,
        difference: w(plan.toLose),
        differenceLabel: 'To lose',
        plan: `Lose ${formatRate(plan.perDay, input.unit)} per day to be on weight.`,
        tone: 'warn',
      };
    case 'tooFast':
      return {
        ...base,
        difference: w(plan.toLose),
        differenceLabel: 'To lose',
        plan: `${formatRate(plan.perDay, input.unit)} per day is faster than safe. Talk to your coach.`,
        tone: 'bad',
      };
  }
}

/**
 * One entry for now and one for each midnight up to weigh-in day, so the
 * countdown and the per-day target stay current even if the app isn't opened.
 * Later days assume the latest weight, since that's all there is to go on.
 */
export function widgetTimeline(
  input: WidgetInput,
  now: Date = new Date(),
): { date: Date; props: CountdownWidgetProps }[] {
  const entries = [{ date: now, props: widgetProps(input, now) }];
  const competition = nextCompetition(input.competitions, now);
  const days = competition
    ? Math.min(daysUntil(weighInDayKey(competition), now) + 1, MAX_TIMELINE_DAYS)
    : 1;
  for (let i = 1; i <= days; i++) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    entries.push({ date: midnight, props: widgetProps(input, midnight) });
  }
  return entries;
}
