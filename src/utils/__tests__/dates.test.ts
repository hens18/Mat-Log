import { fromDateKey, isSameDay, toDateKey } from '../dates';

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
