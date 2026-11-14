import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFoodLogs } from '@/features/nutrition/hooks';
import { mealItemsFromEntries } from '@/features/nutrition/library';
import { useCreateSavedMeal } from '@/features/nutrition/libraryHooks';
import { MEALS, MEAL_LABELS, type MealType } from '@/features/nutrition/summary';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifySuccess } from '@/utils/notify';

/** Saves the foods logged in one meal on one day as a reusable meal. */
export default function SaveMealScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal: MealType = MEALS.includes(params.meal as MealType)
    ? (params.meal as MealType)
    : 'breakfast';
  const food = useFoodLogs();
  const createMeal = useCreateSavedMeal();
  const entries = useMemo(
    () => (food.data ?? []).filter((e) => e.logged_on === params.date && e.meal === meal).reverse(),
    [food.data, params.date, meal],
  );
  const [name, setName] = useState(`My ${MEAL_LABELS[meal].toLowerCase()}`);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const chosen = entries.filter((e) => !excluded.has(e.id));
  const calories = chosen.reduce((total, e) => total + e.calories, 0);

  function toggle(id: string) {
    haptics.selection();
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) return setError('Give the meal a name, like "Pre-practice breakfast".');
    if (chosen.length === 0) return setError('Pick at least one food.');
    setError(null);
    try {
      await createMeal.mutateAsync({ name: name.trim(), items: mealItemsFromEntries(chosen) });
      haptics.success();
      notifySuccess('Meal saved', `${name.trim()} · ${calories} kcal`);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Meal name"
          value={name}
          onChangeText={setName}
          maxLength={80}
          placeholder="Pre-practice breakfast"
        />
        <Card style={styles.list}>
          <Text style={styles.sectionTitle}>Foods in this meal</Text>
          {entries.length === 0 ? (
            <Text style={styles.muted}>Nothing logged in {MEAL_LABELS[meal]} on this day.</Text>
          ) : (
            entries.map((entry, i) => {
              const selected = !excluded.has(entry.id);
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${entry.name}, ${entry.calories} calories`}
                  onPress={() => toggle(entry.id)}
                  style={[styles.row, i > 0 && styles.divider]}>
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.name, !selected && styles.unselected]} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={styles.kcal}>{entry.calories}</Text>
                </Pressable>
              );
            })
          )}
        </Card>
        <Text style={styles.muted}>
          {chosen.length} {chosen.length === 1 ? 'food' : 'foods'} · {calories} kcal. Find it later
          under Meals when you add food.
        </Text>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Save meal" onPress={handleSave} loading={createMeal.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  list: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  unselected: {
    color: colors.textMuted,
  },
  kcal: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
