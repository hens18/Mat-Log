import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { FoodResultRow } from '@/features/nutrition/components/FoodResultRow';
import { useFoodSearch, rememberFoodItem } from '@/features/nutrition/foodSearchHooks';
import { useCreateFoodLog, useFoodLogs } from '@/features/nutrition/hooks';
import {
  MEALS,
  MEAL_LABELS,
  defaultMealForTime,
  recentFoods,
  type FoodTemplate,
  type MealType,
} from '@/features/nutrition/summary';
import { foodSearchConfig } from '@/lib/env';
import { toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

/** Search-first food logging, like MyFitnessPal or Cronometer. */
export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal: MealType = MEALS.includes(params.meal as MealType)
    ? (params.meal as MealType)
    : defaultMealForTime(new Date());
  const dateKey =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toDateKey(new Date());

  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const search = useFoodSearch(query);
  const food = useFoodLogs();
  const createFood = useCreateFoodLog();
  const recents = useMemo(() => recentFoods(food.data ?? [], 12), [food.data]);
  const routeParams = { meal, date: dateKey };

  async function quickLog(template: FoodTemplate) {
    haptics.tap();
    try {
      await createFood.mutateAsync({ ...template, meal, logged_on: dateKey });
      notifySuccess(
        `Added to ${MEAL_LABELS[meal]}`,
        `${template.name} · ${template.calories} kcal`,
      );
    } catch (e) {
      notifyError("Couldn't add food", errorMessage(e));
    }
  }

  const showResults = search.enabled;
  const results = search.data ?? [];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: `Add to ${MEAL_LABELS[meal]}` }} />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods, like chicken breast"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search foods"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.actions}>
          {Platform.OS !== 'web' ? (
            <ActionChip
              icon="barcode-outline"
              label="Scan barcode"
              onPress={() => router.push({ pathname: '/food/scan', params: routeParams })}
            />
          ) : null}
          <ActionChip
            icon="create-outline"
            label="Quick add"
            onPress={() => router.push({ pathname: '/food/quick', params: routeParams })}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {showResults ? (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Results</Text>
              {search.isFetching || search.pending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>
            {search.isError ? (
              <Text style={styles.error}>{errorMessage(search.error)}</Text>
            ) : results.length === 0 && !search.isFetching && !search.pending ? (
              <Text style={styles.muted}>
                No matches. Try fewer words, or use Quick add to type it in.
              </Text>
            ) : (
              results.map((item, i) => (
                <FoodResultRow
                  key={item.key}
                  item={item}
                  showDivider={i > 0}
                  onPress={() => {
                    rememberFoodItem(queryClient, item);
                    router.push({
                      pathname: '/food/item',
                      params: { key: item.key, ...routeParams },
                    });
                  }}
                />
              ))
            )}
          </Card>
        ) : (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            {recents.length === 0 ? (
              <Text style={styles.muted}>
                Foods you log show up here so you can add them again in one tap.
              </Text>
            ) : (
              recents.map((template, i) => (
                <View key={template.name} style={[styles.recent, i > 0 && styles.divider]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Adjust ${template.name} before adding`}
                    style={styles.recentText}
                    onPress={() =>
                      router.push({
                        pathname: '/food/quick',
                        params: {
                          ...routeParams,
                          name: template.name,
                          calories: String(template.calories),
                          protein: template.protein_g?.toString() ?? '',
                          carbs: template.carbs_g?.toString() ?? '',
                          fat: template.fat_g?.toString() ?? '',
                        },
                      })
                    }>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {template.name}
                    </Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {template.calories} kcal
                      {template.serving_label
                        ? ` · ${template.servings === 1 ? '' : `${template.servings} × `}${template.serving_label}`
                        : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${template.name} to ${MEAL_LABELS[meal]}`}
                    hitSlop={8}
                    disabled={createFood.isPending}
                    onPress={() => quickLog(template)}
                    style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                    <Ionicons name="add" size={20} color={colors.onPrimary} />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        )}
        <Text style={styles.footnote}>
          Food data from USDA FoodData Central
          {Platform.OS !== 'web' ? ' and Open Food Facts' : ''}.
          {foodSearchConfig.usingDemoKey && __DEV__
            ? ' Using the shared demo key, which allows only a few searches per hour.'
            : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    // The rounded search bar already frames the field; skip the browser focus ring.
    outlineWidth: 0,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  muted: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  recentText: {
    flex: 1,
    gap: 2,
  },
  recentName: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
