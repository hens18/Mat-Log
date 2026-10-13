import { parseDuration, summarizePractices } from '../stats';

// Wednesday, October 14, 2026. The week started Monday, October 12.
const NOW = new Date(2026, 9, 14, 12);

const practice = (date: string, minutes: number | null, lost: number | null) => ({
  practice_date: date,
  duration_minutes: minutes,
  weight_lost: lost,
});

describe('summarizePractices', () => {
  it('totals practices and minutes for the current week only', () => {
    const summary = summarizePractices(
      [
        practice('2026-10-11', 90, 2), // Sunday, last week
        practice('2026-10-12', 90, 3),
        practice('2026-10-13', null, null),
        practice('2026-10-14', 75, 2.5),
      ],
      NOW,
    );
    expect(summary.thisWeekCount).toBe(3);
    expect(summary.thisWeekMinutes).toBe(165);
  });

  it('averages weight lost over the most recent practices with both weights', () => {
    const practices = Array.from({ length: 12 }, (_, i) =>
      // Oldest two (Oct 1 and 2) lost 10 lb and fall outside the 10-practice window.
      practice(`2026-10-${String(i + 1).padStart(2, '0')}`, 90, i < 2 ? 10 : 2),
    );
    const summary = summarizePractices(practices, NOW);
    expect(summary.averageWeightLost).toBe(2);
    expect(summary.averageSampleSize).toBe(10);
  });

  it('finds the practice with the most weight lost', () => {
    const summary = summarizePractices(
      [practice('2026-10-05', 90, 3.2), practice('2026-10-07', 90, 4.1), practice('2026-10-09', 90, null)],
      NOW,
    );
    expect(summary.mostLost).toEqual({ value: 4.1, date: new Date(2026, 9, 7) });
  });

  it('handles no practices', () => {
    expect(summarizePractices([], NOW)).toEqual({
      thisWeekCount: 0,
      thisWeekMinutes: 0,
      averageWeightLost: null,
      averageSampleSize: 0,
      mostLost: null,
    });
  });
});

describe('parseDuration', () => {
  it('treats empty input as not recorded', () => {
    expect(parseDuration('  ')).toBeNull();
  });

  it('parses whole minutes', () => {
    expect(parseDuration('90')).toBe(90);
  });

  it('rejects decimals, zero, and over 10 hours', () => {
    expect(parseDuration('1.5')).toBe('invalid');
    expect(parseDuration('0')).toBe('invalid');
    expect(parseDuration('601')).toBe('invalid');
    expect(parseDuration('abc')).toBe('invalid');
  });
});
