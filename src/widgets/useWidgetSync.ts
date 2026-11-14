import { useEffect } from 'react';

import { useCompetitions } from '@/features/competitions/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useWeighIns } from '@/features/weigh-ins/hooks';

import { syncCountdownWidget } from './sync';
import { widgetTimeline } from './timeline';

/** Keeps the home screen widget in step with competitions, weigh-ins, and the profile. */
export function useWidgetSync() {
  const competitions = useCompetitions().data;
  const weighIns = useWeighIns().data;
  const profile = useProfile().data;

  useEffect(() => {
    if (!competitions || !weighIns || !profile) return;
    const last = weighIns.at(-1);
    syncCountdownWidget(
      widgetTimeline({
        competitions,
        latest: last ? { weight: last.weight, recordedAt: last.recorded_at } : null,
        profileWeightClass: profile.weight_class,
        unit: profile.weight_unit,
      }),
    );
  }, [competitions, weighIns, profile]);
}
