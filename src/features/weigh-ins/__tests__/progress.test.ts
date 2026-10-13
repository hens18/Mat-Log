import { distanceToGoal, goalProgress, longestStreak, weighInStreak } from '../progress';

describe('goalProgress', () => {
  it('measures progress toward a lower goal', () => {
    expect(goalProgress(160, 155, 150)).toBe(0.5);
  });

  it('measures progress toward a higher goal', () => {
    expect(goalProgress(140, 145, 150)).toBe(0.5);
  });

  it('clamps between 0 and 1', () => {
    expect(goalProgress(160, 162, 150)).toBe(0);
    expect(goalProgress(160, 148, 150)).toBe(1);
  });

  it('handles starting at the goal', () => {
    expect(goalProgress(150, 150, 150)).toBe(1);
    expect(goalProgress(150, 151, 150)).toBe(0);
  });
});

describe('distanceToGoal', () => {
  it('is always positive and rounded', () => {
    expect(distanceToGoal(153.46, 150)).toBe(3.5);
    expect(distanceToGoal(148.8, 150)).toBe(1.2);
  });
});

describe('weighInStreak', () => {
  const now = new Date(2026, 9, 13, 12);
  const day = (d: number, hour = 7) => new Date(2026, 9, d, hour);

  it('counts consecutive days ending today', () => {
    expect(weighInStreak([day(13), day(12), day(12, 17), day(11), day(9)], now)).toBe(3);
  });

  it('keeps the streak alive before today’s weigh-in', () => {
    expect(weighInStreak([day(12), day(11)], now)).toBe(2);
  });

  it('is zero after a missed day', () => {
    expect(weighInStreak([day(10)], now)).toBe(0);
    expect(weighInStreak([], now)).toBe(0);
  });
});

describe('longestStreak', () => {
  const day = (m: number, d: number, hour = 7) => new Date(2026, m, d, hour);

  it('finds the longest run, across month boundaries', () => {
    expect(
      // Sep 29, Sep 30, Oct 1, Oct 2 (twice), then a gap.
      longestStreak([day(8, 29), day(8, 30), day(9, 1), day(9, 2), day(9, 2, 18), day(9, 5)]),
    ).toBe(4);
  });

  it('handles empty and single-day logs', () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak([day(9, 1)])).toBe(1);
  });
});
