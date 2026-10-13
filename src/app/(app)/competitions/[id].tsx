import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import {
  CompetitionForm,
  type CompetitionFormValues,
} from '@/features/competitions/components/CompetitionForm';
import {
  useCompetition,
  useDeleteCompetition,
  useSaveCompetition,
} from '@/features/competitions/hooks';
import { useWeightUnit } from '@/features/profile/hooks';
import { confirm } from '@/utils/confirm';
import { fromDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

export default function EditCompetitionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWeightUnit();
  const { competition, isPending } = useCompetition(id);
  const save = useSaveCompetition();
  const remove = useDeleteCompetition();

  const initialValues = useMemo<CompetitionFormValues | null>(
    () =>
      competition
        ? {
            name: competition.name,
            date: fromDateKey(competition.starts_on),
            weighInAt: competition.weigh_in_at ? new Date(competition.weigh_in_at) : null,
            weightClass: competition.weight_class ? String(competition.weight_class) : '',
            location: competition.location ?? '',
            notes: competition.notes ?? '',
          }
        : null,
    [competition],
  );

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!competition || !initialValues) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This competition no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  async function handleDelete() {
    if (!competition) return;
    haptics.warning();
    if (!(await confirm('Delete competition?', `${competition.name} will be removed.`, 'Delete'))) {
      return;
    }
    try {
      await remove.mutateAsync(competition.id);
      notifySuccess('Competition deleted');
      router.back();
    } catch (e) {
      notifyError("Couldn't delete competition", errorMessage(e));
    }
  }

  return (
    <CompetitionForm
      initialValues={initialValues}
      unit={unit}
      submitLabel="Save changes"
      submitting={save.isPending}
      onSubmit={async (input) => {
        await save.mutateAsync({ id: competition.id, input });
        notifySuccess('Competition updated', input.name);
        router.back();
      }}
      footer={
        <Button
          title="Delete competition"
          variant="ghost"
          textColor={colors.danger}
          onPress={handleDelete}
          loading={remove.isPending}
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
  muted: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
