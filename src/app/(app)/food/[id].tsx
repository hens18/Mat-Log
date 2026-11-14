import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import { FoodForm, type FoodFormValues } from '@/features/nutrition/components/FoodForm';
import { NutrientList } from '@/features/nutrition/components/NutrientList';
import { useDeleteFoodLog, useFoodLog, useUpdateFoodLog } from '@/features/nutrition/hooks';
import { parseMicros } from '@/features/nutrition/micros';
import { percentCaption } from '@/features/nutrition/targets';
import { useNutrientTargets } from '@/features/nutrition/useNutrientTargets';
import { confirm } from '@/utils/confirm';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

const gramsText = (value: number | null) => (value == null ? '' : String(value));

export default function EditFoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entry, isPending } = useFoodLog(id);
  const updateFood = useUpdateFoodLog();
  const deleteFood = useDeleteFoodLog();
  const targets = useNutrientTargets();

  const initialValues = useMemo<FoodFormValues | null>(
    () =>
      entry
        ? {
            name: entry.name,
            calories: String(entry.calories),
            protein: gramsText(entry.protein_g),
            carbs: gramsText(entry.carbs_g),
            fat: gramsText(entry.fat_g),
            meal: entry.meal,
          }
        : null,
    [entry],
  );
  const micros = useMemo(() => parseMicros(entry?.micros) ?? {}, [entry]);

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!entry || !initialValues) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>This entry no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  async function handleDelete() {
    if (!entry) return;
    haptics.warning();
    if (
      !(await confirm('Delete entry?', `${entry.name} will be removed from this day.`, 'Delete'))
    ) {
      return;
    }
    try {
      await deleteFood.mutateAsync(entry.id);
      notifySuccess('Entry deleted');
      router.back();
    } catch (e) {
      notifyError("Couldn't delete entry", errorMessage(e));
    }
  }

  return (
    <FoodForm
      initialValues={initialValues}
      dateKey={entry.logged_on}
      submitLabel="Save changes"
      submitting={updateFood.isPending}
      onSubmit={async (changes) => {
        await updateFood.mutateAsync({ id: entry.id, changes });
        notifySuccess('Entry updated');
        router.back();
      }}
      footer={
        <>
          {Object.keys(micros).length > 0 ? (
            <Card style={styles.microCard}>
              <View style={styles.microHeader}>
                <Text style={styles.microTitle}>Micronutrients</Text>
                <Text style={styles.microCaption}>{`As logged · ${percentCaption(targets)}`}</Text>
              </View>
              <NutrientList micros={micros} />
            </Card>
          ) : null}
          <Button
            title="Delete entry"
            variant="ghost"
            textColor={colors.danger}
            onPress={handleDelete}
            loading={deleteFood.isPending}
          />
        </>
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
  microCard: {
    gap: spacing.xs,
  },
  microHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  microTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  microCaption: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  message: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
