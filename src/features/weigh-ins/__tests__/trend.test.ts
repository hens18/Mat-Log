import {
  biggestDailyMoves,
  buildTrend,
  computeStats,
  rangeStart,
  roundWeight,
  startOfWeek,
  type WeightReading,
} from '../trend';

// Dates are built with local-time constructors so the tests pass in any time
// zone. Month is zero-based: 9 = October.
const at = (month: number, day: number, hour = 8) => new Date(2026, month, day, hour);
const reading = (weight: number, date: Date): WeightReading => ({ weight, recordedAt: date });

// Wednesday, October 14, 2026 at noon.
const NOW = at(9, 14, 12);

describe('roundWeight', () => {
  it('rounds to one decimal and hides float noise', () => {
    expect(roundWeight(150.2 - 149.9)).toBe(0.3);
    expect(roundWeight(148.25)).toBe(148.3);
  });
});

describe('startOfWeek', () => {
  it('starts weeks on Monday', () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 9, 12));
    // Sunday belongs to the week that started the previous Monday.
    expect(startOfWeek(at(9, 18))).toEqual(new Date(2026, 9, 12));
  });
});

describe('rangeStart', () => {
  it('covers the last 7 days including today', () => {
    expect(rangeStart('day', NOW)).toEqual(new Date(2026, 9, 8));
  });

  it('covers the last 12 weeks including this one', () => {
    expect(rangeStart('week', NOW)).toEqual(new Date(2026, 6, 27));
  });

  it('covers the last 12 months including this one', () => {
    expect(rangeStart('month', NOW)).toEqual(new Date(2025, 10, 1));
  });
});

describe('buildTrend', () => {
  it('returns no points when there are no readings', () => {
    expect(buildTrend([], 'day', NOW)).toEqual([]);
  });

  it('day view plots every reading in the last 7 days, oldest first', () => {
    const points = buildTrend(
      [
        reading(151, at(9, 14, 7)),
        reading(155, at(9, 1)), // older than 7 days
        reading(152, at(9, 13, 21)),
        reading(150, at(9, 13, 7)),
      ],
      'day',
      NOW,
    );
    expect(points.map((p) => p.value)).toEqual([150, 152, 151]);
    expect(points.every((p) => p.count === 1)).toBe(true);
  });

  it('keeps readings timestamped slightly after "now" (clock skew)', () => {
    expect(buildTrend([reading(150, at(9, 14, 18))], 'day', NOW)).toHaveLength(1);
  });

  it('week view averages each Monday-to-Sunday week', () => {
    const points = buildTrend(
      [
        reading(150, at(9, 5)),
        reading(152, at(9, 11)), // Sunday, same week as Oct 5
        reading(149, at(9, 12)),
        reading(148, at(9, 13)),
      ],
      'week',
      NOW,
    );
    expect(points).toEqual([
      { date: new Date(2026, 9, 5), value: 151, count: 2 },
      { date: new Date(2026, 9, 12), value: 148.5, count: 2 },
    ]);
  });

  it('month view averages each calendar month and skips empty months', () => {
    const points = buildTrend(
      [reading(160, at(6, 2)), reading(158.3, at(6, 20)), reading(150.1, at(9, 1))],
      'month',
      NOW,
    );
    expect(points).toEqual([
      { date: new Date(2026, 6, 1), value: 159.2, count: 2 },
      { date: new Date(2026, 9, 1), value: 150.1, count: 1 },
    ]);
  });

  it('accepts ISO strings from Supabase', () => {
    const points = buildTrend([{ weight: 150, recordedAt: at(9, 13).toISOString() }], 'day', NOW);
    expect(points).toHaveLength(1);
  });
});

describe('biggestDailyMoves', () => {
  it('compares daily averages, so practice cuts within a day do not count', () => {
    const { biggestJump, biggestDrop } = biggestDailyMoves(
      [
        reading(152, at(9, 12, 7)),
        reading(148, at(9, 12, 18)), // same day: average 150
        reading(151, at(9, 13, 7)),
      ],
      'day',
      NOW,
    );
    expect(biggestJump).toEqual({
      from: new Date(2026, 9, 12),
      to: new Date(2026, 9, 13),
      change: 1,
    });
    expect(biggestDrop).toBeNull();
  });

  it('finds the largest jump and drop with their dates', () => {
    const { biggestJump, biggestDrop } = biggestDailyMoves(
      [
        reading(150, at(9, 8)),
        reading(151.5, at(9, 9)), // +1.5
        reading(149, at(9, 10)), // -2.5
        reading(149.4, at(9, 11)), // +0.4
        reading(148.6, at(9, 12)), // -0.8
      ],
      'day',
      NOW,
    );
    expect(biggestJump?.change).toBe(1.5);
    expect(biggestJump?.to).toEqual(new Date(2026, 9, 9));
    expect(biggestDrop?.change).toBe(-2.5);
    expect(biggestDrop?.from).toEqual(new Date(2026, 9, 9));
    expect(biggestDrop?.to).toEqual(new Date(2026, 9, 10));
  });

  it('compares across gaps between logged days', () => {
    const { biggestDrop } = biggestDailyMoves(
      [reading(152, at(9, 8)), reading(149, at(9, 12))],
      'day',
      NOW,
    );
    expect(biggestDrop).toEqual({
      from: new Date(2026, 9, 8),
      to: new Date(2026, 9, 12),
      change: -3,
    });
  });

  it('returns nulls with fewer than two logged days', () => {
    expect(biggestDailyMoves([reading(150, at(9, 13))], 'day', NOW)).toEqual({
      biggestJump: null,
      biggestDrop: null,
    });
  });
});

describe('computeStats', () => {
  const readings = [
    reading(160, at(7, 3)), // August, outside the day range
    reading(151, at(9, 10)),
    reading(150.2, at(9, 12)),
    reading(149.6, at(9, 13)),
  ];

  it('reports change since the previous reading', () => {
    expect(computeStats(readings, 'day', NOW).sinceLast).toEqual({ latest: 149.6, change: -0.6 });
  });

  it('net change uses the first and last chart points in the range', () => {
    expect(computeStats(readings, 'day', NOW).netChange).toBe(-1.4);
    // Month view: August average 160 vs October average (151 + 150.2 + 149.6) / 3 = 150.3
    expect(computeStats(readings, 'month', NOW).netChange).toBe(-9.7);
  });

  it('handles an empty log', () => {
    expect(computeStats([], 'week', NOW)).toEqual({
      sinceLast: null,
      netChange: null,
      biggestJump: null,
      biggestDrop: null,
    });
  });
});
