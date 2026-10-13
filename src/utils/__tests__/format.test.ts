import { formatChange, formatWeight, greeting } from '../format';

describe('formatWeight', () => {
  it('always shows one decimal place', () => {
    expect(formatWeight(150, 'lb')).toBe('150.0 lb');
    expect(formatWeight(68.25, 'kg')).toBe('68.3 kg');
  });
});

describe('formatChange', () => {
  it('adds a sign for gains and losses', () => {
    expect(formatChange(1.2, 'lb')).toBe('+1.2 lb');
    expect(formatChange(-0.4, 'lb')).toBe('-0.4 lb');
    expect(formatChange(0, 'lb')).toBe('0.0 lb');
  });
});

describe('greeting', () => {
  const at = (hour: number) => new Date(2026, 9, 13, hour);

  it('matches the time of day', () => {
    expect(greeting(at(2))).toBe('Up late');
    expect(greeting(at(7))).toBe('Good morning');
    expect(greeting(at(14))).toBe('Good afternoon');
    expect(greeting(at(20))).toBe('Good evening');
  });
});
