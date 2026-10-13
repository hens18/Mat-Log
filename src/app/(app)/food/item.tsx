import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { MACRO_COLORS } from '@/features/nutrition/colors';
import { MealPicker } from '@/features/nutrition/components/MealPicker';
import { NutrientList } from '@/features/nutrition/components/NutrientList';
import { nutritionFor, parseQuantity, type FoodItem } from '@/features/nutrition/foodItem';
import { useRememberedFoodItem } from '@/features/nutrition/foodSearchHooks';
import { useCreateFoodLog } from '@/features/nutrition/hooks';
import { entryFromItem } from '@/features/nutrition/library';
import { useIsFavorite, useToggleFavorite } from '@/features/nutrition/libraryHooks';
import { percentCaption } from '@/features/nutrition/targets';
import { useNutrientTargets } from '@/features/nutrition/useNutrientTargets';
import {
  MEALS,
  MEAL_LABELS,
  defaultMealForTime,
  type MealType,
} from '@/features/nutrition/summary';
import { fromDateKey, toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

const QUANTITY_STEP = 0.5;

type Params = { key?: string; meal?: string; date?: string };

export default function FoodItemScreen() {
  const params = useLocalSearchParams<Params>();
  const item = useRememberedFoodItem(params.key);

  if (!item) {
    // Happens after a reload, since picked foods live in memory.
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This food is no longer loaded. Search for it again.</Text>
        <Button title="Back to search" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  return <FoodItemForm item={item} params={params} />;
}

function FoodItemForm({ item, params }: { item: FoodItem; params: Params }) {
  const createFood = useCreateFoodLog();
  const targets = useNutrientTargets();
  const favorite = useIsFavorite(item.key);
  const toggleFavorite = useToggleFavorite();
  const [servingIndex, setServingIndex] = useState(0);
  const [quantityText, setQuantityText] = useState('1');
  const [meal, setMeal] = useState<MealType>(
    MEALS.includes(params.meal as MealType)
      ? (params.meal as MealType)
      : defaultMealForTime(new Date()),
  );
  const [error, setError] = useState<string | null>(null);
  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toDateKey(new Date());

  const serving = item.servings[servingIndex];
  const quantity = parseQuantity(quantityText);
  const totals = nutritionFor(item, serving, quantity ?? 0);

  function step(delta: number) {
    haptics.selection();
    const next = Math.max(QUANTITY_STEP, Math.round(((quantity ?? 1) + delta) * 100) / 100);
    setQuantityText(String(Math.min(next, 100)));
  }

  async function handleAdd() {
    if (quantity === null) {
      setError('Enter how many servings, like 1 or 1.5.');
      return;
    }
    setError(null);
    try {
      await createFood.mutateAsync({
        ...entryFromItem(item, serving, quantity),
        logged_on: dateKey,
        meal,
      });
      notifySuccess(`Added to ${MEAL_LABELS[meal]}`, `${item.name} · ${totals.calories} kcal`);
      router.dismissTo('/fuel');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleFavorite() {
    haptics.selection();
    try {
      await toggleFavorite.mutateAsync({ item, favorite: !favorite });
      notifySuccess(favorite ? 'Removed from favorites' : 'Added to favorites', item.name);
    } catch (e) {
      notifyError("Couldn't update favorites", errorMessage(e));
    }
  }

  const sourceLabel =
    item.source === 'custom'
      ? 'My food'
      : item.source === 'usda'
        ? 'USDA FoodData Central'
        : 'Open Food Facts';

  const dayLabel = fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <Stack.Screen
        options={{
          title: item.brand ?? 'Food',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityState={{ selected: favorite }}
              hitSlop={12}
              disabled={toggleFavorite.isPending}
              onPress={handleFavorite}
              style={styles.headerButton}>
              <Ionicons
                name={favorite ? 'star' : 'star-outline'}
                size={22}
                color={favorite ? colors.warning : colors.text}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {item.brand ?? (item.source === 'custom' ? 'Custom' : 'Generic')}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{sourceLabel}</Text>
            </View>
            {item.source === 'custom' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit this food"
                hitSlop={8}
                onPress={() =>
                  router.push({ pathname: '/food/custom', params: { id: item.sourceId } })
                }>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Card style={styles.totals}>
          <View style={styles.kcalRow}>
            <Text style={styles.kcal}>{totals.calories}</Text>
            <Text style={styles.kcalUnit}>kcal</Text>
          </View>
          <Text style={styles.muted}>
            {quantity ?? 0} × {serving.label}
          </Text>
          <View style={styles.macros}>
            {(
              [
                ['Protein', totals.protein, MACRO_COLORS.protein],
                ['Carbs', totals.carbs, MACRO_COLORS.carbs],
                ['Fat', totals.fat, MACRO_COLORS.fat],
              ] as const
            ).map(([label, grams, color]) => (
              <View key={label} style={[styles.macro, { borderColor: `${color}55` }]}>
                <Text style={[styles.macroLabel, { color }]}>{label}</Text>
                <Text style={styles.macroValue}>
                  {grams == null ? 'n/a' : grams}
                  {grams == null ? null : <Text style={styles.macroUnit}> g</Text>}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.microCard}>
          <View style={styles.microHeader}>
            <Text style={styles.microTitle}>Micronutrients</Text>
            <Text style={styles.microCaption}>{percentCaption(targets)}</Text>
          </View>
          <NutrientList micros={totals.micros} />
        </Card>

        <View style={styles.field}>
          <Text style={styles.label}>Serving size</Text>
          <Card style={styles.servings}>
            {item.servings.map((option, i) => {
              const selected = i === servingIndex;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    if (selected) return;
                    haptics.selection();
                    setServingIndex(i);
                  }}
                  style={[styles.serving, i > 0 && styles.divider]}>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.servingText, selected && styles.servingSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.servingKcal}>
                    {nutritionFor(item, option, 1).calories} kcal
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Number of servings</Text>
          <View style={styles.quantityRow}>
            <StepButton icon="remove" label="Fewer servings" onPress={() => step(-QUANTITY_STEP)} />
            <TextInput
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="decimal-pad"
              selectTextOnFocus
              accessibilityLabel="Number of servings"
              style={styles.quantityInput}
            />
            <StepButton icon="add" label="More servings" onPress={() => step(QUANTITY_STEP)} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Meal · {dayLabel}</Text>
          <MealPicker value={meal} onChange={setMeal} />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button
          title={`Add to ${MEAL_LABELS[meal]}`}
          icon="add-circle"
          onPress={handleAdd}
          loading={createFood.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
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
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: {
    gap: spacing.sm,
  },
  name: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  tagText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  totals: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  kcal: {
    fontSize: 64,
    lineHeight: 68,
    fontFamily: fonts.display,
    color: colors.text,
  },
  kcalUnit: {
    fontSize: 20,
    lineHeight: 34,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  macros: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  macro: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
  macroValue: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.text,
  },
  macroUnit: {
    fontSize: 13,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  field: {
    gap: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
  },
  editLink: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.primary,
    paddingVertical: 4,
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
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  servings: {
    paddingVertical: spacing.xs,
  },
  serving: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  servingText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  servingSelected: {
    color: colors.text,
    fontFamily: fonts.semibold,
  },
  servingKcal: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  step: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  quantityInput: {
    flex: 1,
    // Web inputs have an intrinsic minimum width that would push the + button off screen.
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
