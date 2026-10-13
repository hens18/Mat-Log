import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import {
  PracticeForm,
  type PracticeFormValues,
} from '@/features/practices/components/PracticeForm';
import { volumeInputText } from '@/features/practices/hydration';
import { useDeletePractice, usePractice, useUpdatePractice } from '@/features/practices/hooks';
import { useWeightUnit } from '@/features/profile/hooks';
import { useWeighIns } from '@/features/weigh-ins/hooks';
import { confirm } from '@/utils/confirm';
import { fromDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

export default function EditPracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWeightUnit();
  const weighIns = useWeighIns();
  const { practice, isPending } = usePractice(id);
  const updatePractice = useUpdatePractice();
  const deletePractice = useDeletePractice();

  const initialValues = useMemo<PracticeFormValues | null>(
    () =>
      practice
        ? {
            date: fromDateKey(practice.practice_date),
            duration: practice.duration_minutes ? String(practice.duration_minutes) : '',
            intensity: practice.intensity,
            preWeight: practice.pre_weight !== null ? String(practice.pre_weight) : '',
            postWeight: practice.post_weight !== null ? String(practice.post_weight) : '',
            fluidDuring: volumeInputText(practice.fluid_during_ml, unit),
            notes: practice.notes ?? '',
          }
        : null,
    [practice, unit],
  );

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!practice || !initialValues) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>This practice no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  async function handleDelete() {
    if (!practice) return;
    haptics.warning();
    const ok = await confirm(
      'Delete practice?',
      'This also deletes its reflection. Your weigh-ins are not affected.',
      'Delete',
    );
    if (!ok) return;
    try {
      await deletePractice.mutateAsync(practice.id);
      notifySuccess('Practice deleted');
      router.dismissTo('/practices');
    } catch (e) {
      notifyError("Couldn't delete practice", errorMessage(e));
    }
  }

  return (
    <PracticeForm
      initialValues={initialValues}
      unit={unit}
      weighIns={weighIns.data ?? []}
      submitLabel="Save changes"
      submitting={updatePractice.isPending}
      onSubmit={async (changes) => {
        await updatePractice.mutateAsync({ id: practice.id, changes });
        notifySuccess('Practice updated');
        router.back();
      }}
      footer={
        <Button
          title="Delete practice"
          variant="ghost"
          textColor={colors.danger}
          onPress={handleDelete}
          loading={deletePractice.isPending}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  message: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
