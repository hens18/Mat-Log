import type { WeighIn } from '@/types/models';

import { findWeighIn } from '../prefill';

const weighIn = (id: string, kind: WeighIn['kind'], date: Date, weight = 150): WeighIn => ({
  id,
  user_id: 'u',
  weight,
  kind,
  recorded_at: date.toISOString(),
  note: null,
  created_at: '',
  updated_at: '',
});

describe('findWeighIn', () => {
  const weighIns = [
    weighIn('a', 'pre_practice', new Date(2026, 9, 12, 14), 152),
    weighIn('b', 'pre_practice', new Date(2026, 9, 12, 15), 152.4),
    weighIn('c', 'post_practice', new Date(2026, 9, 12, 17), 149),
    weighIn('d', 'pre_practice', new Date(2026, 9, 13, 14), 151),
  ];

  it('returns the latest weigh-in of that kind on that day', () => {
    expect(findWeighIn(weighIns, '2026-10-12', 'pre_practice')?.id).toBe('b');
    expect(findWeighIn(weighIns, '2026-10-12', 'post_practice')?.id).toBe('c');
  });

  it('returns null when there is no match', () => {
    expect(findWeighIn(weighIns, '2026-10-12', 'night')).toBeNull();
    expect(findWeighIn(weighIns, '2026-10-14', 'pre_practice')).toBeNull();
  });
});
