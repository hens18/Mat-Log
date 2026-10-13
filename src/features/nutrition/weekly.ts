// The weekly micronutrient report: average daily intake over 7 days compared
// with personal targets, which nutrients are running low or high, and which
// logged foods supplied the most of each. Pure functions, no React.

import type { Json } from '@/types/database';
import { fromDateKey, toDateKey } from '@/utils/dates';

import {
  MICRONUTRIENTS,
  parseMicros,
  roundAmount,
  type MicroDefinition,
  type MicroKey,
} from './micros';
import { percentOfTarget, type NutrientTargets, type ProteinTarget } from './targets';

export type WeeklyEntry = {
  logged_on: string;
  name: string;
  micros: Json | null;
  protein_g: number | null;
};

export type NutrientStatus = 'low' | 'below' | 'onTrack' | 'over' | 'noTarget' | 'noData';

export type FoodSource = { name: string; amount: number };

export type WeeklyNutrient = {
  def: MicroDefinition;
  /** Average per day across days with nutrient data. */
  average: number;
  target: number | null;
  percent: number | null;
  status: NutrientStatus;
  /** How many entries with nutrient data reported this one. */
  reportedBy: number;
  /** True when fewer than half the foods with data reported this nutrient. */
  sparse: boolean;
  /** Logged foods that supplied the most this week, largest first. */
  topSources: FoodSource[];
};

export type WeeklyReport = {
  /** First and last day of the 7-day window (inclusive). */
  startKey: string;
  endKey: string;
  daysLogged: number;
  daysWithData: number;
  entriesWithData: number;
  totalEntries: number;
  nutrients: WeeklyNutrient[];
  /** Target nutrients under 90% of target with enough data, lowest first. */
  low: WeeklyNutrient[];
  /** Limit nutrients over 100%, highest first. */
  over: WeeklyNutrient[];
  onTrack: WeeklyNutrient[];
  protein: { average: number; target: ProteinTarget; percent: number } | null;
};

export const WEEK_LENGTH = 7;

/** Date key for the first day of the 7-day window ending on endKey. */
export function weekStartKey(endKey: string): string {
  const end = fromDateKey(endKey);
  return toDateKey(new Date(end.getFullYear(), end.getMonth(), end.getDate() - (WEEK_LENGTH - 1)));
}

/** Shifts a date key by whole days. */
export function shiftDateKey(key: string, days: number): string {
  const date = fromDateKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function statusFor(def: MicroDefinition, percent: number | null): NutrientStatus {
  if (percent === null) return 'noTarget';
  if (def.goal === 'limit') return percent > 100 ? 'over' : 'onTrack';
  if (percent < 50) return 'low';
  if (percent < 90) return 'below';
  return 'onTrack';
}

export function buildWeeklyReport(
  entries: readonly WeeklyEntry[],
  targets: NutrientTargets,
  endKey: string,
  protein: ProteinTarget | null = null,
): WeeklyReport {
  const startKey = weekStartKey(endKey);
  const week = entries.filter((e) => e.logged_on >= startKey && e.logged_on <= endKey);

  const daysLogged = new Set(week.map((e) => e.logged_on));
  const daysWithData = new Set<string>();
  const totals: Partial<Record<MicroKey, number>> = {};
  const reportedBy: Partial<Record<MicroKey, number>> = {};
  const sources: Partial<Record<MicroKey, Map<string, number>>> = {};
  let entriesWithData = 0;

  for (const entry of week) {
    const micros = parseMicros(entry.micros);
    if (!micros) continue;
    entriesWithData += 1;
    daysWithData.add(entry.logged_on);
    for (const def of MICRONUTRIENTS) {
      const amount = micros[def.key];
      if (amount == null) continue;
      totals[def.key] = (totals[def.key] ?? 0) + amount;
      reportedBy[def.key] = (reportedBy[def.key] ?? 0) + 1;
      const byFood = (sources[def.key] ??= new Map());
      byFood.set(entry.name, (byFood.get(entry.name) ?? 0) + amount);
    }
  }

  const days = daysWithData.size;
  const nutrients: WeeklyNutrient[] = MICRONUTRIENTS.map((def) => {
    const target = targets.values[def.key];
    const count = reportedBy[def.key] ?? 0;
    if (count === 0 || days === 0) {
      return {
        def,
        average: 0,
        target,
        percent: null,
        status: 'noData',
        reportedBy: 0,
        sparse: true,
        topSources: [],
      };
    }
    const average = roundAmount(totals[def.key]! / days);
    const percent = percentOfTarget(target, average);
    const topSources = [...(sources[def.key]?.entries() ?? [])]
      .map(([name, amount]) => ({ name, amount: roundAmount(amount) }))
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    return {
      def,
      average,
      target,
      percent,
      status: statusFor(def, percent),
      reportedBy: count,
      sparse: count < entriesWithData / 2,
      topSources,
    };
  });

  const low = nutrients
    .filter((n) => (n.status === 'low' || n.status === 'below') && !n.sparse)
    .sort((a, b) => a.percent! - b.percent!);
  const over = nutrients.filter((n) => n.status === 'over').sort((a, b) => b.percent! - a.percent!);
  const onTrack = nutrients.filter((n) => n.status === 'onTrack');

  const proteinDays = new Set(week.filter((e) => e.protein_g != null).map((e) => e.logged_on));
  const proteinTotal = week.reduce((sum, e) => sum + (e.protein_g ?? 0), 0);
  const proteinAverage = proteinDays.size ? Math.round(proteinTotal / proteinDays.size) : null;

  return {
    startKey,
    endKey,
    daysLogged: daysLogged.size,
    daysWithData: days,
    entriesWithData,
    totalEntries: week.length,
    nutrients,
    low,
    over,
    onTrack,
    protein:
      protein && proteinAverage !== null
        ? {
            average: proteinAverage,
            target: protein,
            percent: Math.round((proteinAverage / protein.grams) * 100),
          }
        : null,
  };
}
