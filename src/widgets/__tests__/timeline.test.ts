import type { Competition } from '@/features/competitions/countdown';

import { widgetProps, widgetTimeline } from '../timeline';

const NOW = new Date(2026, 9, 13, 15, 0);
const comp = (starts_on: string, weight_class: number | null = 152): Competition => ({
  id: starts_on,
  user_id: 'u',
  name: 'Districts',
  starts_on,
  weigh_in_at: null,
  weight_class,
  location: null,
  notes: null,
  created_at: '',
  updated_at: '',
});
const latest = { weight: 153.8, recordedAt: NOW.toISOString() };

describe('widgetProps', () => {
  it('shows the countdown, weights, and the per-day target', () => {
    expect(
      widgetProps(
        { competitions: [comp('2026-10-25')], latest, profileWeightClass: null, unit: 'lb' },
        NOW,
      ),
    ).toMatchObject({
      hasCompetition: true,
      name: 'Districts',
      days: '12',
      daysLabel: 'days to go',
      weight: '153.8 lb',
      weightClass: '152.0 lb',
      difference: '1.8 lb',
      plan: 'Lose 0.15 lb per day to be on weight.',
      tone: 'warn',
    });
  });

  it('flags an unsafe pace and celebrates being on weight', () => {
    const fast = widgetProps(
      {
        competitions: [comp('2026-10-15')],
        latest: { ...latest, weight: 158 },
        profileWeightClass: null,
        unit: 'lb',
      },
      NOW,
    );
    expect(fast.tone).toBe('bad');
    expect(fast.plan).toContain('faster than safe');
    const made = widgetProps(
      {
        competitions: [comp('2026-10-15')],
        latest: { ...latest, weight: 151.5 },
        profileWeightClass: null,
        unit: 'lb',
      },
      NOW,
    );
    expect(made).toMatchObject({ tone: 'good', differenceLabel: 'Under by', difference: '0.5 lb' });
  });

  it('falls back to the profile weight class and handles no competition', () => {
    expect(
      widgetProps(
        { competitions: [comp('2026-10-25', null)], latest, profileWeightClass: 152, unit: 'lb' },
        NOW,
      ).weightClass,
    ).toBe('152.0 lb');
    expect(
      widgetProps({ competitions: [], latest, profileWeightClass: null, unit: 'lb' }, NOW),
    ).toMatchObject({
      hasCompetition: false,
      weight: '153.8 lb',
    });
  });
});

describe('widgetTimeline', () => {
  it('adds an entry each midnight through the day after weigh-ins', () => {
    const entries = widgetTimeline(
      { competitions: [comp('2026-10-16')], latest, profileWeightClass: null, unit: 'lb' },
      NOW,
    );
    expect(entries.map((e) => e.props.days)).toEqual(['3', '2', '1', '0', '--']);
    expect(entries[1].date).toEqual(new Date(2026, 9, 14));
    // The per-day target grows as days run out: 1.8 lb over 3, 2, 1, then 1 day.
    expect(entries.slice(0, 4).map((e) => e.props.plan)).toEqual([
      'Lose 0.6 lb per day to be on weight.',
      'Lose 0.9 lb per day to be on weight.',
      expect.stringContaining('faster than safe'),
      expect.stringContaining('faster than safe'),
    ]);
  });
});
