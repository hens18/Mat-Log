import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { rememberFoodItem } from '@/features/nutrition/foodSearchHooks';
import { fromCustomFood, type CustomFood } from '@/features/nutrition/library';
import {
  useCustomFoods,
  useDeleteCustomFood,
  useSaveCustomFood,
} from '@/features/nutrition/libraryHooks';
import {
  MICRONUTRIENTS,
  parseMicros,
  type MicroKey,
  type Micros,
} from '@/features/nutrition/micros';
import { parseCalories, parseGrams } from '@/features/nutrition/summary';
import { confirm } from '@/utils/confirm';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

type Params = { id?: string; meal?: string; date?: string };

/** Create a reusable food (or edit one), then log it like any searched food. */
export default function CustomFoodScreen() {
  const params = useLocalSearchParams<Params>();
  const foods = useCustomFoods();

  if (params.id && foods.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const existing = params.id ? foods.data?.find((f) => f.id === params.id) : undefined;
  if (params.id && !existing) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This food no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  return <CustomFoodForm existing={existing} params={params} />;
}

const text = (value: number | null | undefined) => (value == null ? '' : String(value));

/** Parses an optional non-negative amount below a limit. */
function parseAmount(input: string, max: number): number | null | 'invalid' {
  const trimmed = input.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 'invalid';
  const value = Math.round(Number(trimmed) * 100) / 100;
  return value <= max ? value : 'invalid';
}

function CustomFoodForm({ existing, params }: { existing?: CustomFood; params: Params }) {
  const queryClient = useQueryClient();
  const saveFood = useSaveCustomFood();
  const deleteFood = useDeleteCustomFood();
  const initialMicros = parseMicros(existing?.micros ?? null) ?? {};

  const [name, setName] = useState(existing?.name ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [servingLabel, setServingLabel] = useState(existing?.serving_label ?? '1 serving');
  const [servingGrams, setServingGrams] = useState(text(existing?.serving_grams));
  const [calories, setCalories] = useState(text(existing?.calories));
  const [protein, setProtein] = useState(text(existing?.protein_g));
  const [carbs, setCarbs] = useState(text(existing?.carbs_g));
  const [fat, setFat] = useState(text(existing?.fat_g));
  const [micros, setMicros] = useState<Record<MicroKey, string>>(() => {
    const values = {} as Record<MicroKey, string>;
    for (const def of MICRONUTRIENTS) values[def.key] = text(initialMicros[def.key]);
    return values;
  });
  const [showMicros, setShowMicros] = useState(Object.keys(initialMicros).length > 0);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) return setError('Give the food a name.');
    if (!servingLabel.trim()) return setError('Describe one serving, like "1 bar" or "1 cup".');
    const grams = parseAmount(servingGrams, 5000);
    if (grams === 'invalid' || grams === 0) {
      return setError('Serving weight must be grams, like 45, or left blank.');
    }
    const kcal = parseCalories(calories);
    if (kcal === null) return setError('Calories must be a whole number, like 250.');
    const macros = [parseGrams(protein), parseGrams(carbs), parseGrams(fat)];
    if (macros.includes('invalid')) return setError('Macros must be grams, like 24 or 12.5.');
    const [protein_g, carbs_g, fat_g] = macros as (number | null)[];

    const parsedMicros: Micros = {};
    for (const def of MICRONUTRIENTS) {
      const value = parseAmount(micros[def.key], 100000);
      if (value === 'invalid') {
        return setError(`${def.label} must be a number in ${def.unit}, or left blank.`);
      }
      if (value !== null) parsedMicros[def.key] = value;
    }

    setError(null);
    try {
      const saved = await saveFood.mutateAsync({
        id: existing?.id,
        input: {
          name: name.trim(),
          brand: brand.trim() || null,
          serving_label: servingLabel.trim(),
          serving_grams: grams,
          calories: kcal,
          protein_g,
          carbs_g,
          fat_g,
          micros: Object.keys(parsedMicros).length ? parsedMicros : null,
        },
      });
      haptics.success();
      if (existing) {
        notifySuccess('Food updated', saved.name);
        router.back();
        return;
      }
      notifySuccess('Saved to My foods', saved.name);
      // Go straight to logging it.
      const item = fromCustomFood(saved);
      rememberFoodItem(queryClient, item);
      router.replace({
        pathname: '/food/item',
        params: { key: item.key, meal: params.meal, date: params.date },
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDelete() {
    if (!existing) return;
    haptics.warning();
    const ok = await confirm(
      'Delete this food?',
      `${existing.name} will be removed from My foods. Entries you already logged stay.`,
      'Delete',
    );
    if (!ok) return;
    try {
      await deleteFood.mutateAsync(existing.id);
      notifySuccess('Food deleted');
      router.back();
    } catch (e) {
      notifyError("Couldn't delete food", errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <Stack.Screen options={{ title: existing ? 'Edit food' : 'Create food' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!existing ? (
          <Text style={styles.muted}>
            Save a food that isn&apos;t in the database, like a homemade meal or a team snack. It
            goes in My foods so you can log it again any time.
          </Text>
        ) : null}

        <Card style={styles.section}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Mom's chicken and rice"
            maxLength={120}
          />
          <TextField
            label="Brand (optional)"
            value={brand}
            onChangeText={setBrand}
            placeholder="Homemade"
            maxLength={80}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Serving"
                value={servingLabel}
                onChangeText={setServingLabel}
                placeholder="1 bowl"
                maxLength={60}
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Weight (g, optional)"
                value={servingGrams}
                onChangeText={setServingGrams}
                keyboardType="decimal-pad"
                placeholder="350"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Per serving</Text>
          <TextField
            label="Calories"
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            placeholder="520"
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Protein (g)"
                value={protein}
                onChangeText={setProtein}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Carbs (g)"
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Fat (g)"
                value={fat}
                onChangeText={setFat}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMicros }}
            onPress={() => {
              haptics.selection();
              setShowMicros((v) => !v);
            }}
            style={styles.disclosure}>
            <View style={styles.flex}>
              <Text style={styles.sectionTitle}>Vitamins and minerals</Text>
              <Text style={styles.muted}>Optional. Copy them from the nutrition label.</Text>
            </View>
            <Ionicons
              name={showMicros ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
          {showMicros ? (
            <View style={styles.microGrid}>
              {MICRONUTRIENTS.map((def) => (
                <View key={def.key} style={styles.microField}>
                  <TextField
                    label={`${def.label} (${def.unit})`}
                    value={micros[def.key]}
                    onChangeText={(value) => setMicros((m) => ({ ...m, [def.key]: value }))}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button
          title={existing ? 'Save changes' : 'Save and log'}
          onPress={handleSave}
          loading={saveFood.isPending}
        />
        {existing ? (
          <Button
            title="Delete food"
            variant="ghost"
            textColor={colors.danger}
            onPress={handleDelete}
            loading={deleteFood.isPending}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  flex: {
    flex: 1,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs - 2,
    rowGap: spacing.md,
  },
  microField: {
    width: '50%',
    paddingHorizontal: spacing.xs + 2,
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
