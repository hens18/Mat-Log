import { router } from 'expo-router';
import { useState } from 'react';

import { useWeightUnit } from '@/features/profile/hooks';
import { WeighInForm, type WeighInFormValues } from '@/features/weigh-ins/components/WeighInForm';
import { useCreateWeighIn } from '@/features/weigh-ins/hooks';
import { defaultKindForTime } from '@/features/weigh-ins/kind';

export default function LogWeighInScreen() {
  const unit = useWeightUnit();
  const createWeighIn = useCreateWeighIn();
  const [initialValues] = useState<WeighInFormValues>(() => {
    const now = new Date();
    return { weight: '', kind: defaultKindForTime(now), note: '', recordedAt: now };
  });

  return (
    <WeighInForm
      initialValues={initialValues}
      unit={unit}
      submitLabel="Save weigh-in"
      submitting={createWeighIn.isPending}
      onSubmit={async (values) => {
        await createWeighIn.mutateAsync(values);
        router.back();
      }}
    />
  );
}
