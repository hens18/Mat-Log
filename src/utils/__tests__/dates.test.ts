import { fromDateKey, isSameDay, toDateKey, toTimeValue, withDay, withTime } from '../dates';

describe('date keys', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('parses a date key as local midnight, not UTC', () => {
    const date = fromDateKey('2026-10-12');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
  });

  it('round-trips', () => {
    expect(toDateKey(fromDateKey('2026-03-08'))).toBe('2026-03-08');
  });

  it('compares calendar days', () => {
    expect(isSameDay(new Date(2026, 9, 12, 1), new Date(2026, 9, 12, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 12, 23), new Date(2026, 9, 13, 0))).toBe(false);
  });
});

describe('withDay / withTime', () => {
  const base = new Date(2026, 9, 12, 7, 30);

  it('changes the day but keeps the time', () => {
    expect(withDay(base, new Date(2026, 8, 30, 22, 0))).toEqual(new Date(2026, 8, 30, 7, 30));
  });

  it('changes the time but keeps the day', () => {
    expect(withTime(base, new Date(2000, 0, 1, 17, 5, 44))).toEqual(new Date(2026, 9, 12, 17, 5));
  });

  it('formats a time input value', () => {
    expect(toTimeValue(new Date(2026, 9, 12, 7, 5))).toBe('07:05');
  });
});
