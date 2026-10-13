import {
  ageGroupFor,
  describeTargets,
  nutrientTargets,
  percentOfTarget,
  proteinTarget,
} from '../targets';

const NOW = new Date(2026, 9, 13);

describe('ageGroupFor', () => {
  it('maps birth years to DRI age groups', () => {
    expect(ageGroupFor(2015, NOW)).toBe('9-13');
    expect(ageGroupFor(2010, NOW)).toBe('14-18');
    expect(ageGroupFor(2008, NOW)).toBe('14-18');
    expect(ageGroupFor(2007, NOW)).toBe('19-30');
    expect(ageGroupFor(1990, NOW)).toBe('31-50');
    expect(ageGroupFor(1970, NOW)).toBe('51+');
  });
});

describe('nutrientTargets', () => {
  it('falls back to FDA Daily Values without sex', () => {
    const t = nutrientTargets({ sex: null, birthYear: 2009, calorieGoal: null }, NOW);
    expect(t.personalized).toBe(false);
    expect(t.values.potassium).toBe(4700);
    expect(t.values.iron).toBe(18);
    expect(t.values.sugar).toBeNull();
  });

  it('uses teen intakes for a 17 year old male wrestler', () => {
    const t = nutrientTargets({ sex: 'male', birthYear: 2009, calorieGoal: null }, NOW);
    expect(t.personalized).toBe(true);
    expect(t.ageGroup).toBe('14-18');
    expect(t.values).toMatchObject({
      calcium: 1300,
      iron: 11,
      potassium: 3000,
      magnesium: 410,
      zinc: 11,
      vitaminC: 75,
      fiber: 38,
    });
  });

  it('gives adult women more iron than adult men', () => {
    const female = nutrientTargets({ sex: 'female', birthYear: 2000, calorieGoal: null }, NOW);
    const male = nutrientTargets({ sex: 'male', birthYear: 2000, calorieGoal: null }, NOW);
    expect(female.values.iron).toBe(18);
    expect(male.values.iron).toBe(8);
    expect(female.values.calcium).toBe(1000);
  });

  it('assumes ages 19 to 30 when the birth year is missing', () => {
    const t = nutrientTargets({ sex: 'female', birthYear: null, calorieGoal: null }, NOW);
    expect(t.ageGroup).toBe('19-30');
    expect(t.ageAssumed).toBe(true);
    expect(describeTargets(t)).toContain('assumed');
  });

  it('sets fiber and saturated fat from the calorie goal', () => {
    const t = nutrientTargets({ sex: 'male', birthYear: 2009, calorieGoal: 3000 }, NOW);
    expect(t.values.fiber).toBe(42);
    expect(t.values.saturatedFat).toBe(33);
    expect(t.fromCalories).toBe(true);
  });
});

describe('proteinTarget', () => {
  it('uses 1.6 g per kg, converting from pounds', () => {
    expect(proteinTarget(150, 'lb')).toEqual({ grams: 109, low: 95, high: 136, weightKg: 68 });
    expect(proteinTarget(70, 'kg')?.grams).toBe(112);
  });

  it('returns null without a weight', () => {
    expect(proteinTarget(null, 'lb')).toBeNull();
  });
});

describe('percentOfTarget', () => {
  it('rounds to a whole percent and handles missing targets', () => {
    expect(percentOfTarget(3000, 1500)).toBe(50);
    expect(percentOfTarget(null, 10)).toBeNull();
  });
});
