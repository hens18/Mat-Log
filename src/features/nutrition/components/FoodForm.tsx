import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { fromDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import type { FoodInput } from '../api';
import { MACRO_COLORS } from '../colors';
import { parseCalories, parseGrams, type FoodTemplate, type MealType } from '../summary';
import { MealPicker } from './MealPicker';

export type FoodFormValues = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  meal: MealType;
};

const gramsText = (value: number | null) => (value == null ? '' : String(value));

type FoodFormProps = {
  initialValues: FoodFormValues;
  /** YYYY-MM-DD the entry belongs to. */
  dateKey: string;
  recents?: FoodTemplate[];
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: FoodInput) => Promise<void>;
  footer?: React.ReactNode;
};

export function FoodForm({
  initialValues,
  dateKey,
  recents = [],
  submitLabel,
  submitting,
  onSubmit,
  footer,
}: FoodFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [calories, setCalories] = useState(initialValues.calories);
  const [protein, setProtein] = useState(initialValues.protein);
  const [carbs, setCarbs] = useState(initialValues.carbs);
  const [fat, setFat] = useState(initialValues.fat);
  const [meal, setMeal] = useState(initialValues.meal);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(food: FoodTemplate) {
    haptics.selection();
    setName(food.name);
    setCalories(String(food.calories));
    setProtein(gramsText(food.protein_g));
    setCarbs(gramsText(food.carbs_g));
    setFat(gramsText(food.fat_g));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Give the food a name.');
      return;
    }
    const kcal = parseCalories(calories);
    if (kcal === null) {
      setError('Calories must be a whole number, like 350.');
      return;
    }
    const macros = [parseGrams(protein), parseGrams(carbs), parseGrams(fat)];
    if (macros.includes('invalid')) {
      setError('Macros must be grams, like 24 or 12.5.');
      return;
    }
    const [protein_g, carbs_g, fat_g] = macros as (number | null)[];
    setError(null);
    try {
      await onSubmit({
        logged_on: dateKey,
        meal,
        name: name.trim(),
        calories: kcal,
        protein_g,
        carbs_g,
        fat_g,
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const dateLabel = fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.date}>Logging for {dateLabel}</Text>

        {recents.length > 0 ? (
          <View style={styles.field}>
            <Text style={styles.label}>Recent</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled">
              {recents.map((food) => (
                <Pressable
                  key={food.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${food.name}, ${food.calories} calories`}
                  onPress={() => applyTemplate(food)}
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                  <Text style={styles.chipName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text style={styles.chipKcal}>{food.calories} kcal</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <TextField
          label="Food"
          value={name}
          onChangeText={setName}
          placeholder="Grilled chicken and rice"
          maxLength={120}
          autoFocus={!initialValues.name && recents.length === 0}
        />

        <TextField
          label="Calories"
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          placeholder="450"
          selectTextOnFocus
          style={styles.calories}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Meal</Text>
          <MealPicker value={meal} onChange={setMeal} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Macros (optional, grams)</Text>
          <View style={styles.macros}>
            {(
              [
                ['Protein', protein, setProtein, MACRO_COLORS.protein],
                ['Carbs', carbs, setCarbs, MACRO_COLORS.carbs],
                ['Fat', fat, setFat, MACRO_COLORS.fat],
              ] as const
            ).map(([label, value, setValue, color]) => (
              <View key={label} style={styles.macro}>
                <TextField
                  label={label}
                  value={value}
                  onChangeText={setValue}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  style={{ borderColor: `${color}66` }}
                />
              </View>
            ))}
          </View>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button title={submitLabel} onPress={handleSubmit} loading={submitting} />
        {footer}
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
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  date: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    maxWidth: 180,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  chipName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  chipKcal: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  calories: {
    minHeight: 64,
    fontSize: 34,
    fontFamily: fonts.display,
  },
  macros: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macro: {
    flex: 1,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
