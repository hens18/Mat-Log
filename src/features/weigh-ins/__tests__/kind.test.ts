import { defaultKindForTime, parseWeight, stepWeight } from '../kind';

describe('defaultKindForTime', () => {
  const at = (hour: number) => new Date(2026, 9, 14, hour);

  it('picks a kind based on the hour', () => {
    expect(defaultKindForTime(at(6))).toBe('morning');
    expect(defaultKindForTime(at(13))).toBe('pre_practice');
    expect(defaultKindForTime(at(17))).toBe('post_practice');
    expect(defaultKindForTime(at(22))).toBe('night');
  });
});

describe('parseWeight', () => {
  it('parses whole and decimal weights', () => {
    expect(parseWeight('150')).toBe(150);
    expect(parseWeight(' 149.6 ')).toBe(149.6);
  });

  it('accepts a comma decimal separator', () => {
    expect(parseWeight('68,4')).toBe(68.4);
  });

  it('rounds to one decimal place', () => {
    expect(parseWeight('150.26')).toBe(150.3);
  });

  it('rejects empty, non-numeric, and out-of-range input', () => {
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('abc')).toBeNull();
    expect(parseWeight('-150')).toBeNull();
    expect(parseWeight('0')).toBeNull();
    expect(parseWeight('1000')).toBeNull();
    expect(parseWeight('1.2.3')).toBeNull();
  });
});

describe('stepWeight', () => {
  it('adds and subtracts without float noise', () => {
    expect(stepWeight('150.2', 0.1)).toBe('150.3');
    expect(stepWeight('150', -1)).toBe('149.0');
    expect(stepWeight('0.3', -0.1)).toBe('0.2');
  });

  it('leaves invalid or out-of-range input unchanged', () => {
    expect(stepWeight('', 1)).toBe('');
    expect(stepWeight('abc', 1)).toBe('abc');
    expect(stepWeight('0.1', -0.1)).toBe('0.1');
  });
});
