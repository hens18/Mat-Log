import type { WeighIn, WeighInKind } from '@/types/models';
import { toDateKey } from '@/utils/dates';

/** The most recent weigh-in of a kind on a calendar day, used to prefill practice weights. */
export function findWeighIn(
  weighIns: readonly WeighIn[],
  dateKey: string,
  kind: WeighInKind,
): WeighIn | null {
  let found: WeighIn | null = null;
  for (const w of weighIns) {
    if (w.kind !== kind || toDateKey(new Date(w.recorded_at)) !== dateKey) continue;
    if (!found || w.recorded_at > found.recorded_at) found = w;
  }
  return found;
}
