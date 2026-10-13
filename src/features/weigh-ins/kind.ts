import type { WeighInKind } from '@/types/models';

/** A sensible default kind for the current time of day; the user can change it. */
export function defaultKindForTime(date: Date): WeighInKind {
  const hour = date.getHours();
  if (hour < 11) return 'morning';
  if (hour < 15) return 'pre_practice';
  if (hour < 20) return 'post_practice';
  return 'night';
}

/**
 * Parses what the user typed into a weight, accepting a comma as the decimal
 * separator. Returns null for anything the database would reject.
 */
export function parseWeight(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 10) / 10;
  return value > 0 && value < 1000 ? value : null;
}
