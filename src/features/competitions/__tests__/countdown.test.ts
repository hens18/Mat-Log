import {
  countdownLabel,
  daysUntil,
  nextCompetition,
  weighInDayKey,
  weightPlan,
} from '../countdown';

const NOW = new Date(2026, 9, 13, 15, 0);

describe('dates', () => {
  it('counts calendar days, not 24-hour periods', () => {
    expect(daysUntil('2026-10-13', NOW)).toBe(0);
    expect(daysUntil('2026-10-14', NOW)).toBe(1);
    expect(daysUntil('2026-10-25', NOW)).toBe(12);
    expect(daysUntil('2026-10-10', NOW)).toBe(-3);
  });

  it('uses the weigh-in date when it differs from the event date', () => {
    const weighIn = new Date(2026, 9, 23, 18, 0).toISOString();
    expect(weighInDayKey({ starts_on: '2026-10-24', weigh_in_at: weighIn })).toBe('2026-10-23');
    expect(weighInDayKey({ starts_on: '2026-10-24', weigh_in_at: null })).toBe('2026-10-24');
  });

  it('picks the soonest competition that has not passed', () => {
    const comps = [
      { id: 'past', starts_on: '2026-10-10', weigh_in_at: null },
      { id: 'later', starts_on: '2026-11-07', weigh_in_at: null },
      { id: 'today', starts_on: '2026-10-13', weigh_in_at: null },
    ];
    expect(nextCompetition(comps, NOW)?.id).toBe('today');
    expect(nextCompetition(comps.slice(0, 2), NOW)?.id).toBe('later');
    expect(nextCompetition([comps[0]], NOW)).toBeNull();
  });

  it('labels the countdown', () => {
    expect(countdownLabel(0)).toBe('Today');
    expect(countdownLabel(1)).toBe('Tomorrow');
    expect(countdownLabel(12)).toBe('12 days');
  });
});

describe('weightPlan', () => {
  it('splits the weight to lose evenly over the days left', () => {
    expect(weightPlan({ currentWeight: 153.8, weightClass: 152, days: 12 })).toEqual({
      status: 'onPace',
      toLose: 1.8,
      perDay: 0.15,
      perWeek: 1.1,
      percentPerWeek: 0.7,
      maxPerWeek: 2.3,
      reason: null,
    });
  });

  it('flags plans faster than 1.5% of body weight per week', () => {
    const plan = weightPlan({ currentWeight: 160, weightClass: 152, days: 10 });
    expect(plan).toMatchObject({
      status: 'tooFast',
      reason: 'weekly',
      toLose: 8,
      perDay: 0.8,
      percentPerWeek: 3.5,
    });
  });

  it('flags a big one-day drop even when the week looks fine', () => {
    expect(weightPlan({ currentWeight: 153.8, weightClass: 152, days: 1 })).toMatchObject({
      status: 'tooFast',
      reason: 'daily',
      perDay: 1.8,
    });
  });

  it('reports being on weight with the margin', () => {
    expect(weightPlan({ currentWeight: 151.4, weightClass: 152, days: 5 })).toEqual({
      status: 'onWeight',
      margin: 0.6,
    });
    expect(weightPlan({ currentWeight: 152, weightClass: 152, days: 5 })).toEqual({
      status: 'onWeight',
      margin: 0,
    });
  });

  it('treats weigh-in day as one day left', () => {
    const plan = weightPlan({ currentWeight: 152.4, weightClass: 152, days: 0 });
    expect(plan).toMatchObject({ status: 'onPace', toLose: 0.4, perDay: 0.4, perWeek: 0.4 });
  });

  it('asks for what is missing', () => {
    expect(weightPlan({ currentWeight: 150, weightClass: null, days: 3 }).status).toBe(
      'noWeightClass',
    );
    expect(weightPlan({ currentWeight: null, weightClass: 152, days: 3 }).status).toBe('noWeight');
  });
});
