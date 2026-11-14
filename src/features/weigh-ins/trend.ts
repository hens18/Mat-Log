// Pure functions behind the trend chart and stats. Nothing here touches React
// or Supabase, so it can be unit tested directly. All calendar math uses the
// device's local time zone, since "a day" for a wrestler means their day.

export type TrendRange = 'day' | 'week' | 'month';

export type WeightReading = {
  weight: number;
  recordedAt: string | Date;
};

export type TrendPoint = {
  /** Start of the bucket (or the reading time in the Day view). */
  date: Date;
  /** Weight, or the average weight for week and month buckets. */
  value: number;
  /** Number of readings that went into this point. */
  count: number;
};

export type DailyMove = {
  from: Date;
  to: Date;
  change: number;
};

export type WeightStats = {
  /** Latest reading minus the one before it, regardless of range. */
  sinceLast: { latest: number; change: number } | null;
  /** Last chart point minus the first chart point in the range. */
  netChange: number | null;
  /** Largest increase between two consecutive logged days in the range. */
  biggestJump: DailyMove | null;
  /** Largest decrease between two consecutive logged days in the range. */
  biggestDrop: DailyMove | null;
};

/** How far back each view looks, in its own unit. */
export const RANGE_LENGTH: Record<TrendRange, number> = {
  day: 7,
  week: 12,
  month: 12,
};

export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Weeks start on Monday. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** The earliest moment included in a range, counting the current period. */
export function rangeStart(range: TrendRange, now: Date = new Date()): Date {
  const length = RANGE_LENGTH[range];
  switch (range) {
    case 'day': {
      const today = startOfDay(now);
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() - (length - 1));
    }
    case 'week': {
      const week = startOfWeek(now);
      return new Date(week.getFullYear(), week.getMonth(), week.getDate() - 7 * (length - 1));
    }
    case 'month': {
      const month = startOfMonth(now);
      return new Date(month.getFullYear(), month.getMonth() - (length - 1), 1);
    }
  }
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

type NormalizedReading = { weight: number; date: Date };

function normalize(readings: readonly WeightReading[]): NormalizedReading[] {
  return readings
    .map((r) => ({ weight: r.weight, date: toDate(r.recordedAt) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// No upper bound: a reading saved a moment ago can carry a server timestamp
// slightly ahead of the device clock, and it should still show up.
function inRange(readings: NormalizedReading[], range: TrendRange, now: Date) {
  const start = rangeStart(range, now).getTime();
  return readings.filter((r) => r.date.getTime() >= start);
}

/** Groups readings into buckets and averages each one. Input must be sorted. */
function averageBy(readings: NormalizedReading[], bucketStart: (date: Date) => Date): TrendPoint[] {
  const buckets = new Map<number, { date: Date; total: number; count: number }>();
  for (const r of readings) {
    const date = bucketStart(r.date);
    const key = date.getTime();
    const bucket = buckets.get(key) ?? { date, total: 0, count: 0 };
    bucket.total += r.weight;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({ date: b.date, value: roundWeight(b.total / b.count), count: b.count }));
}

/**
 * Chart points for a range:
 * - day: every reading from the last 7 days
 * - week: weekly averages for the last 12 weeks
 * - month: monthly averages for the last 12 months
 * Periods with no readings are skipped rather than plotted as zero.
 */
export function buildTrend(
  readings: readonly WeightReading[],
  range: TrendRange,
  now: Date = new Date(),
): TrendPoint[] {
  const visible = inRange(normalize(readings), range, now);
  switch (range) {
    case 'day':
      return visible.map((r) => ({ date: r.date, value: r.weight, count: 1 }));
    case 'week':
      return averageBy(visible, startOfWeek);
    case 'month':
      return averageBy(visible, startOfMonth);
  }
}

/**
 * Biggest jump and drop between consecutive logged days. Each day is reduced
 * to its average so a post-practice reading doesn't count as a huge drop from
 * that morning. Days without readings are skipped, so a move can span a gap.
 */
export function biggestDailyMoves(
  readings: readonly WeightReading[],
  range: TrendRange,
  now: Date = new Date(),
): { biggestJump: DailyMove | null; biggestDrop: DailyMove | null } {
  const days = averageBy(inRange(normalize(readings), range, now), startOfDay);
  let biggestJump: DailyMove | null = null;
  let biggestDrop: DailyMove | null = null;

  for (let i = 1; i < days.length; i++) {
    const change = roundWeight(days[i].value - days[i - 1].value);
    const move = { from: days[i - 1].date, to: days[i].date, change };
    if (change > 0 && (!biggestJump || change > biggestJump.change)) {
      biggestJump = move;
    }
    if (change < 0 && (!biggestDrop || change < biggestDrop.change)) {
      biggestDrop = move;
    }
  }

  return { biggestJump, biggestDrop };
}

export function computeStats(
  readings: readonly WeightReading[],
  range: TrendRange,
  now: Date = new Date(),
): WeightStats {
  const sorted = normalize(readings);
  const latest = sorted.at(-1);
  const previous = sorted.at(-2);
  const sinceLast =
    latest && previous
      ? { latest: latest.weight, change: roundWeight(latest.weight - previous.weight) }
      : null;

  const points = buildTrend(readings, range, now);
  const netChange =
    points.length >= 2 ? roundWeight(points[points.length - 1].value - points[0].value) : null;

  return { sinceLast, netChange, ...biggestDailyMoves(readings, range, now) };
}
