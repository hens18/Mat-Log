import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import { MACRO_COLORS } from '@/features/nutrition/colors';
import { MealPicker } from '@/features/nutrition/components/MealPicker';
import { NutrientList } from '@/features/nutrition/components/NutrientList';
import { mealToInputs, mealTotals, parseMealItems } from '@/features/nutrition/library';
import { useDeleteSavedMeal, useLogFoods, useSavedMeals } from '@/features/nutrition/libraryHooks';
import { sumMicros } from '@/features/nutrition/micros';
import {
  MEALS,
  MEAL_LABELS,
  defaultMealForTime,
  type MealType,
} from '@/features/nutrition/summary';
import { confirm } from '@/utils/confirm';
import { fromDateKey, toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

/** A saved meal: what's in it, and logging it in one tap. */
export default function SavedMealScreen() {
  const params = useLocalSearchParams<{ id: string; meal?: string; date?: string }>();
  const meals = useSavedMeals();
  const logFoods = useLogFoods();
  const deleteMeal = useDeleteSavedMeal();
  const saved = meals.data?.find((m) => m.id === params.id);
  const items = useMemo(() => (saved ? parseMealItems(saved.items) : []), [saved]);
  const totals = mealTotals(items);
  const micros = useMemo(() => sumMicros(items), [items]);
  const [meal, setMeal] = useState<MealType>(
    MEALS.includes(params.meal as MealType)
      ? (params.meal as MealType)
      : defaultMealForTime(new Date()),
  );
  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toDateKey(new Date());

  if (meals.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!saved) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This meal no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  async function handleLog() {
    if (!saved) return;
    try {
      await logFoods.mutateAsync(mealToInputs(items, meal, dateKey));
      haptics.success();
      notifySuccess(`Added to ${MEAL_LABELS[meal]}`, `${saved.name} · ${totals.calories} kcal`);
      router.dismissTo('/fuel');
    } catch (e) {
      notifyError("Couldn't add meal", errorMessage(e));
    }
  }

  async function handleDelete() {
    if (!saved) return;
    haptics.warning();
    const ok = await confirm(
      'Delete this meal?',
      `${saved.name} will be removed from your saved meals. Foods you already logged stay.`,
      'Delete',
    );
    if (!ok) return;
    try {
      await deleteMeal.mutateAsync(saved.id);
      notifySuccess('Meal deleted');
      router.back();
    } catch (e) {
      notifyError("Couldn't delete meal", errorMessage(e));
    }
  }

  const dayLabel = fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: saved.name }} />
      <Card style={styles.totals}>
        <View style={styles.kcalRow}>
          <Text style={styles.kcal}>{totals.calories}</Text>
          <Text style={styles.kcalUnit}>kcal</Text>
        </View>
        <View style={styles.macros}>
          {(
            [
              ['Protein', totals.protein, MACRO_COLORS.protein],
              ['Carbs', totals.carbs, MACRO_COLORS.carbs],
              ['Fat', totals.fat, MACRO_COLORS.fat],
            ] as const
          ).map(([label, grams, color]) => (
            <Text key={label} style={styles.macro}>
              <Text style={{ color }}>{label}</Text> {grams} g
            </Text>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>
          {items.length} {items.length === 1 ? 'food' : 'foods'}
        </Text>
        {items.map((item, i) => (
          <View key={`${item.name}-${i}`} style={[styles.item, i > 0 && styles.divider]}>
            <View style={styles.flex}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.serving_label ? (
                <Text style={styles.muted} numberOfLines={1}>
                  {item.servings === 1 ? '' : `${item.servings} × `}
                  {item.serving_label}
                </Text>
              ) : null}
            </View>
            <Text style={styles.itemKcal}>{item.calories}</Text>
          </View>
        ))}
      </Card>

      {micros.entriesWithData > 0 ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Micronutrients</Text>
          <NutrientList micros={micros.totals} />
        </Card>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Meal · {dayLabel}</Text>
        <MealPicker value={meal} onChange={setMeal} />
      </View>
      <Button
        title={`Add to ${MEAL_LABELS[meal]}`}
        icon="add-circle"
        onPress={handleLog}
        loading={logFoods.isPending}
      />
      <Button
        title="Delete meal"
        variant="ghost"
        textColor={colors.danger}
        onPress={handleDelete}
        loading={deleteMeal.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  totals: {
    gap: spacing.sm,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  kcal: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: fonts.display,
    color: colors.text,
  },
  kcalUnit: {
    fontSize: 18,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  macros: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macro: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  flex: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  itemKcal: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
