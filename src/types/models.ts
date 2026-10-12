import type { Enums, Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;
export type WeighIn = Tables<'weigh_ins'>;
export type Practice = Tables<'practices'>;
export type PracticeReflection = Tables<'practice_reflections'>;

export type WeighInKind = Enums<'weigh_in_kind'>;
export type WeightUnit = Enums<'weight_unit'>;

export const WEIGH_IN_KINDS: readonly WeighInKind[] = [
  'morning',
  'pre_practice',
  'post_practice',
  'night',
] as const;

export const WEIGH_IN_KIND_LABELS: Record<WeighInKind, string> = {
  morning: 'Morning',
  pre_practice: 'Pre-practice',
  post_practice: 'Post-practice',
  night: 'Night',
};
