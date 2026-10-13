import { useProfile } from '@/features/profile/hooks';
import type { Practice } from '@/types/models';
import { toDateKey } from '@/utils/dates';

import { estimateSweat, formatVolume } from './hydration';
import { scheduleRehydrationReminder } from './reminders';

/**
 * Returns a function that schedules a rehydration reminder for a practice
 * saved today, when reminders are on and there is fluid to make up.
 */
export function useRehydrationReminder() {
  const profile = useProfile().data;
  return (practice: Practice) => {
    if (!profile?.hydration_reminders) return;
    if (practice.practice_date !== toDateKey(new Date())) return;
    const estimate = estimateSweat({
      preWeight: practice.pre_weight,
      postWeight: practice.post_weight,
      unit: profile.weight_unit,
      fluidDuringMl: practice.fluid_during_ml,
      durationMinutes: practice.duration_minutes,
    });
    if (!estimate || estimate.targets.fluidMl === 0) return;
    // Best effort: a denied permission or scheduling error shouldn't block saving.
    scheduleRehydrationReminder(
      practice.id,
      formatVolume(estimate.targets.fluidMl, profile.weight_unit),
    ).catch(() => {});
  };
}
