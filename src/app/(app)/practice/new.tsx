import { router } from 'expo-router';
import { useState } from 'react';

import {
  PracticeForm,
  type PracticeFormValues,
} from '@/features/practices/components/PracticeForm';
import { useCreatePractice } from '@/features/practices/hooks';
import { findWeighIn } from '@/features/practices/prefill';
import { useWeightUnit } from '@/features/profile/hooks';
import { useWeighIns } from '@/features/weigh-ins/hooks';
import { toDateKey } from '@/utils/dates';
import { notifySuccess } from '@/utils/notify';

export default function NewPracticeScreen() {
  const unit = useWeightUnit();
  const weighIns = useWeighIns();
  const createPractice = useCreatePractice();

  // Start from today's pre/post-practice weigh-ins when they exist.
  const [initialValues] = useState<PracticeFormValues>(() => {
    const today = toDateKey(new Date());
    const list = weighIns.data ?? [];
    const pre = findWeighIn(list, today, 'pre_practice');
    const post = findWeighIn(list, today, 'post_practice');
    return {
      date: new Date(),
      duration: '',
      intensity: null,
      preWeight: pre ? String(pre.weight) : '',
      postWeight: post ? String(post.weight) : '',
      fluidDuring: '',
      notes: '',
    };
  });

  return (
    <PracticeForm
      initialValues={initialValues}
      unit={unit}
      weighIns={weighIns.data ?? []}
      submitLabel="Save practice"
      submitting={createPractice.isPending}
      onSubmit={async (values) => {
        const practice = await createPractice.mutateAsync(values);
        notifySuccess('Practice saved');
        router.replace({ pathname: '/practice/[id]', params: { id: practice.id } });
      }}
    />
  );
}
