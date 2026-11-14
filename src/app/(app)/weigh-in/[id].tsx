import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import { useWeightUnit } from '@/features/profile/hooks';
import { WeighInForm, type WeighInFormValues } from '@/features/weigh-ins/components/WeighInForm';
import { useDeleteWeighIn, useUpdateWeighIn, useWeighIn } from '@/features/weigh-ins/hooks';
import { confirm } from '@/utils/confirm';
import { errorMessage, formatWeight } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

export default function EditWeighInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWeightUnit();
  const { weighIn, isPending } = useWeighIn(id);
  const updateWeighIn = useUpdateWeighIn();
  const deleteWeighIn = useDeleteWeighIn();

  const initialValues = useMemo<WeighInFormValues | null>(
    () =>
      weighIn
        ? {
            weight: String(weighIn.weight),
            kind: weighIn.kind,
            note: weighIn.note ?? '',
            recordedAt: new Date(weighIn.recorded_at),
          }
        : null,
    [weighIn],
  );

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!weighIn || !initialValues) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>This weigh-in no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  async function handleDelete() {
    if (!weighIn) return;
    haptics.warning();
    const ok = await confirm(
      'Delete weigh-in?',
      `${formatWeight(weighIn.weight, unit)} will be removed from your log.`,
      'Delete',
    );
    if (!ok) return;
    try {
      await deleteWeighIn.mutateAsync(weighIn.id);
      notifySuccess('Weigh-in deleted');
      router.back();
    } catch (e) {
      notifyError("Couldn't delete weigh-in", errorMessage(e));
    }
  }

  return (
    <WeighInForm
      initialValues={initialValues}
      unit={unit}
      submitLabel="Save changes"
      submitting={updateWeighIn.isPending}
      onSubmit={async (changes) => {
        await updateWeighIn.mutateAsync({ id: weighIn.id, changes });
        notifySuccess('Weigh-in updated', formatWeight(changes.weight, unit));
        router.back();
      }}
      footer={
        <Button
          title="Delete weigh-in"
          variant="ghost"
          onPress={handleDelete}
          loading={deleteWeighIn.isPending}
          textColor={colors.danger}
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
