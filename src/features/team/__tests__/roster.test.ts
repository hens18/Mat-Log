import type { Competition } from '@/features/competitions/countdown';
import type { Practice, WeighIn } from '@/types/models';

import {
  buildRoster,
  formatJoinCode,
  lastWeighInLabel,
  normalizeJoinCode,
  sortRoster,
  summarizeRoster,
  type RosterMember,
} from '../roster';

const NOW = new Date(2026, 10, 3, 15, 0);
const at = (daysAgo: number, hour = 7) => new Date(2026, 10, 3 - daysAgo, hour).toISOString();

const member = (
  user_id: string,
  display_name: string | null,
  weight_class: number | null = 160,
): RosterMember => ({
  user_id,
  display_name,
  weight_unit: 'lb',
  weight_class,
  goal_weight: null,
  joined_at: '',
});
const weighIn = (user_id: string, weight: number, daysAgo: number): WeighIn => ({
  id: `${user_id}-${daysAgo}`,
  user_id,
  weight,
  kind: 'morning',
  note: null,
  recorded_at: at(daysAgo),
  created_at: '',
  updated_at: '',
});
const comp = (
  user_id: string,
  starts_on: string,
  weight_class: number | null = null,
): Competition => ({
  id: `${user_id}-${starts_on}`,
  user_id,
  name: 'County Duals',
  starts_on,
  weigh_in_at: null,
  weight_class,
  location: null,
  notes: null,
  created_at: '',
  updated_at: '',
});
const practice = (user_id: string, practice_date: string): Practice => ({
  id: `${user_id}-${practice_date}`,
  user_id,
  practice_date,
  duration_minutes: 90,
  intensity: 3,
  pre_weight: null,
  post_weight: null,
  weight_lost: null,
  notes: null,
  fluid_during_ml: null,
  created_at: '',
  updated_at: '',
});

const data = {
  members: [
    member('henry', 'Henry'),
    member('sam', 'Sam', 145),
    member('jo', null, 132),
    member('kai', 'Kai', null),
  ],
  weighIns: [
    weighIn('henry', 164, 8),
    weighIn('henry', 163.2, 7),
    weighIn('henry', 162.4, 0),
    weighIn('sam', 151, 0), // 6 lb over with 4 days to go: too fast
    weighIn('jo', 131.2, 5), // under, but hasn't weighed in for 5 days
    weighIn('kai', 170, 1),
  ],
  competitions: [
    comp('henry', '2026-11-14'),
    comp('sam', '2026-11-07', 145),
    comp('jo', '2026-11-20'),
  ],
  practices: [
    practice('henry', '2026-11-02'),
    practice('henry', '2026-10-30'),
    practice('henry', '2026-10-20'),
  ],
};

describe('buildRoster', () => {
  const rows = buildRoster(data, NOW);
  const byId = Object.fromEntries(rows.map((r) => [r.userId, r]));

  it('shows the latest weight, week change, next competition, and pace', () => {
    expect(byId.henry).toMatchObject({
      name: 'Henry',
      latest: { weight: 162.4 },
      daysSinceWeighIn: 0,
      weekChange: -0.8,
      next: { name: 'County Duals', days: 11 },
      plan: { status: 'onPace', toLose: 2.4, perDay: 0.22 },
      practicesThisWeek: 2,
      flags: [],
    });
  });

  it('flags unsafe pace, stale weigh-ins, and missing weight classes', () => {
    expect(byId.sam.flags).toEqual(['tooFast']);
    expect(byId.jo).toMatchObject({
      name: 'Unnamed wrestler',
      daysSinceWeighIn: 5,
      plan: { status: 'onWeight', margin: 0.8 },
      flags: ['noRecentWeighIn'],
    });
    expect(byId.kai.flags).toEqual(['noWeightClass']);
    expect(byId.kai.next).toBeNull();
  });

  it('sorts by who needs attention first', () => {
    expect(sortRoster(rows, 'attention').map((r) => r.userId)).toEqual([
      'sam',
      'jo',
      'henry',
      'kai',
    ]);
    expect(sortRoster(rows, 'name').map((r) => r.name)).toEqual([
      'Henry',
      'Kai',
      'Sam',
      'Unnamed wrestler',
    ]);
    expect(sortRoster(rows, 'toLose').map((r) => r.userId)).toEqual(['sam', 'henry', 'jo', 'kai']);
  });

  it('summarizes the team', () => {
    expect(summarizeRoster(rows)).toEqual({
      athletes: 4,
      onWeight: 1,
      onPace: 1,
      tooFast: 1,
      stale: 1,
    });
  });

  it('handles a wrestler with no weigh-ins', () => {
    const [row] = buildRoster({ ...data, members: [member('new', 'New')], weighIns: [] }, NOW);
    expect(row).toMatchObject({
      latest: null,
      daysSinceWeighIn: null,
      plan: { status: 'noWeight' },
    });
    expect(row.flags).toEqual(['noRecentWeighIn']);
  });
});

describe('labels and codes', () => {
  it('labels the last weigh-in', () => {
    expect(lastWeighInLabel(null)).toBe('No weigh-ins yet');
    expect(lastWeighInLabel(0)).toBe('Today');
    expect(lastWeighInLabel(1)).toBe('Yesterday');
    expect(lastWeighInLabel(4)).toBe('4 days ago');
  });

  it('formats and normalizes join codes', () => {
    expect(formatJoinCode('KKECX5F5')).toBe('KKEC-X5F5');
    expect(normalizeJoinCode(' kkec-x5f5 ')).toBe('KKECX5F5');
  });
});
