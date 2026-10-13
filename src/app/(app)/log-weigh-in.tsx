import { router } from 'expo-router';
import { useState } from 'react';

import { useWeightUnit } from '@/features/profile/hooks';
import { WeighInForm, type WeighInFormValues } from '@/features/weigh-ins/components/WeighInForm';
import { useCreateWeighIn, useWeighIns } from '@/features/weigh-ins/hooks';
import { defaultKindForTime } from '@/features/weigh-ins/kind';
import { formatWeight } from '@/utils/format';
import { notifySuccess } from '@/utils/notify';

export default function LogWeighInScreen() {
  const unit = useWeightUnit();
  const createWeighIn = useCreateWeighIn();
  const weighIns = useWeighIns();
  // Start from the most recent weight so a small change is a couple of taps.
  const [last] = useState(() => weighIns.data?.at(-1));
  const [initialValues] = useState<WeighInFormValues>(() => {
    const now = new Date();
    return {
      weight: last ? last.weight.toFixed(1) : '',
      kind: defaultKindForTime(now),
      note: '',
      recordedAt: now,
    };
  });

  return (
    <WeighInForm
      initialValues={initialValues}
      unit={unit}
      submitLabel="Save weigh-in"
      submitting={createWeighIn.isPending}
      weightHint={last ? `Starting from your last weigh-in (${formatWeight(last.weight, unit)})` : undefined}
      onSubmit={async (values) => {
        await createWeighIn.mutateAsync(values);
        notifySuccess('Weigh-in saved', formatWeight(values.weight, unit));
        router.back();
      }}
    />
  );
}
