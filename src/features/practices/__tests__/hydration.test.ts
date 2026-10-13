import {
  estimateSweat,
  formatVolume,
  parseVolume,
  sumDrinks,
  SWEAT_SODIUM,
  volumeInputText,
} from '../hydration';

describe('estimateSweat', () => {
  it('adds fluid drunk during practice to the weight lost', () => {
    const est = estimateSweat({
      preWeight: 72,
      postWeight: 70.5,
      unit: 'kg',
      fluidDuringMl: 500,
      durationMinutes: 120,
    })!;
    expect(est.weightLostKg).toBe(1.5);
    expect(est.sweatMl).toBe(2000);
    expect(est.sweatRateMlPerHour).toBe(1000);
    expect(est.percentBodyWeight).toBe(2.1);
    expect(est.sodiumMg).toEqual({ typical: 1610, low: 460, high: 3218 });
    expect(est.potassiumMg.typical).toBe(392);
    // 1.5 L per kg still missing; the 500 ml drunk during practice is already back.
    expect(est.targets).toEqual({ fluidMl: 2250, sodiumMg: 1610, potassiumMg: 392 });
  });

  it('converts pounds to kilograms', () => {
    const est = estimateSweat({
      preWeight: 152.4,
      postWeight: 149,
      unit: 'lb',
      fluidDuringMl: null,
      durationMinutes: null,
    })!;
    expect(est.weightLostKg).toBe(1.54);
    expect(est.sweatMl).toBe(1542);
    expect(est.sweatRateMlPerHour).toBeNull();
    expect(est.sodiumMg.typical).toBe(Math.round(SWEAT_SODIUM.typical * 1.542));
  });

  it('returns null without both weights or without any loss', () => {
    const base = { unit: 'lb' as const, fluidDuringMl: null, durationMinutes: 90 };
    expect(estimateSweat({ ...base, preWeight: 150, postWeight: null })).toBeNull();
    expect(estimateSweat({ ...base, preWeight: 150, postWeight: 150.5 })).toBeNull();
  });

  it('still counts sweat when drinking made up for it, but asks for no more fluid', () => {
    const est = estimateSweat({
      preWeight: 70,
      postWeight: 70,
      unit: 'kg',
      fluidDuringMl: 800,
      durationMinutes: 60,
    })!;
    expect(est.sweatMl).toBe(800);
    expect(est.targets.fluidMl).toBe(0);
    expect(est.targets.sodiumMg).toBe(644);
  });
});

describe('drinks and volumes', () => {
  it('totals drinks', () => {
    expect(
      sumDrinks([
        { volume_ml: 591, sodium_mg: 270, potassium_mg: 75 },
        { volume_ml: 500, sodium_mg: 0, potassium_mg: 0 },
      ]),
    ).toEqual({ volumeMl: 1091, sodiumMg: 270, potassiumMg: 75 });
  });

  it('formats and parses volumes in the unit that matches the weight unit', () => {
    expect(formatVolume(591, 'lb')).toBe('20 oz');
    expect(formatVolume(750, 'kg')).toBe('750 ml');
    expect(formatVolume(2250, 'kg')).toBe('2.3 L');
    expect(parseVolume('20', 'lb')).toBe(591);
    expect(parseVolume('500', 'kg')).toBe(500);
    expect(parseVolume('', 'kg')).toBeNull();
    expect(parseVolume('abc', 'kg')).toBe('invalid');
    expect(parseVolume('9000', 'kg')).toBe('invalid');
    expect(volumeInputText(591, 'lb')).toBe('20');
  });
});
