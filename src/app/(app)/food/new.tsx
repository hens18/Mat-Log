import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { FoodLibrary } from '@/features/nutrition/components/FoodLibrary';
import { FoodResultRow } from '@/features/nutrition/components/FoodResultRow';
import { useFoodSearch, rememberFoodItem } from '@/features/nutrition/foodSearchHooks';
import {
  MEALS,
  MEAL_LABELS,
  defaultMealForTime,
  type MealType,
} from '@/features/nutrition/summary';
import { foodSearchConfig } from '@/lib/env';
import { toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';

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
  const routeParams = { meal, date: dateKey };

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
            icon="flash-outline"
            label="Quick add"
            onPress={() => router.push({ pathname: '/food/quick', params: routeParams })}
          />
          <ActionChip
            icon="create-outline"
            label="Create food"
            onPress={() => router.push({ pathname: '/food/custom', params: routeParams })}
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
          <FoodLibrary meal={meal} dateKey={dateKey} />
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
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
