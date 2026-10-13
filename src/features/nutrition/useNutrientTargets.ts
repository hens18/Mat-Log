import { useMemo } from 'react';

import { useProfile } from '@/features/profile/hooks';
import { useWeighIns } from '@/features/weigh-ins/hooks';

import {
  nutrientTargets,
  proteinTarget,
  type NutrientTargets,
  type ProteinTarget,
} from './targets';

/** Micronutrient targets from the profile's sex, birth year, and calorie goal. */
export function useNutrientTargets(): NutrientTargets {
  const profile = useProfile().data;
  const sex = profile?.sex ?? null;
  const birthYear = profile?.birth_year ?? null;
  const calorieGoal = profile?.calorie_goal ?? null;
  return useMemo(
    () => nutrientTargets({ sex, birthYear, calorieGoal }),
    [sex, birthYear, calorieGoal],
  );
}

/** Protein target from the latest weigh-in, or the goal weight if there are none. */
export function useProteinTarget(): ProteinTarget | null {
  const profile = useProfile().data;
  const weighIns = useWeighIns().data;
  const weight = weighIns?.at(-1)?.weight ?? profile?.goal_weight ?? null;
  const unit = profile?.weight_unit ?? 'lb';
  return useMemo(() => proteinTarget(weight, unit), [weight, unit]);
}
