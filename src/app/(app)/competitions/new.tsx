import { router } from 'expo-router';
import { useState } from 'react';

import {
  CompetitionForm,
  type CompetitionFormValues,
} from '@/features/competitions/components/CompetitionForm';
import { useSaveCompetition } from '@/features/competitions/hooks';
import { useProfile, useWeightUnit } from '@/features/profile/hooks';
import { haptics } from '@/utils/haptics';
import { notifySuccess } from '@/utils/notify';

export default function NewCompetitionScreen() {
  const unit = useWeightUnit();
  const profile = useProfile();
  const save = useSaveCompetition();
  const [initialValues] = useState<CompetitionFormValues>(() => ({
    name: '',
    date: new Date(),
    weighInAt: null,
    weightClass: profile.data?.weight_class ? String(profile.data.weight_class) : '',
    location: '',
    notes: '',
  }));

  return (
    <CompetitionForm
      initialValues={initialValues}
      unit={unit}
      submitLabel="Save competition"
      submitting={save.isPending}
      onSubmit={async (input) => {
        await save.mutateAsync({ input });
        haptics.success();
        notifySuccess('Competition added', input.name);
        router.back();
      }}
    />
  );
}
