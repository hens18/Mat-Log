import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

import { nutritionFor, type FoodItem } from '../foodItem';
import { rememberFoodItem } from '../foodSearchHooks';
import { useCreateFoodLog, useFoodLogs } from '../hooks';
import {
  entryFromItem,
  fromCustomFood,
  mealToInputs,
  mealTotals,
  parseFavoriteItem,
  parseMealItems,
  type SavedMeal,
} from '../library';
import { useCustomFoods, useFavorites, useLogFoods, useSavedMeals } from '../libraryHooks';
import { MEAL_LABELS, recentFoods, type FoodTemplate, type MealType } from '../summary';

type Tab = 'recent' | 'favorites' | 'mine' | 'meals';

const TABS = [
  { value: 'recent', label: 'Recent' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'mine', label: 'My foods' },
  { value: 'meals', label: 'Meals' },
] as const;

type FoodLibraryProps = {
  meal: MealType;
  dateKey: string;
};

/** What shows on the Add food screen before you search. */
export function FoodLibrary({ meal, dateKey }: FoodLibraryProps) {
  const [tab, setTab] = useState<Tab>('recent');
  return (
    <View style={styles.wrap}>
      <SegmentedControl
        accessibilityLabel="Food lists"
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      {tab === 'recent' ? <RecentList meal={meal} dateKey={dateKey} /> : null}
      {tab === 'favorites' ? <FavoritesList meal={meal} dateKey={dateKey} /> : null}
      {tab === 'mine' ? <MyFoodsList meal={meal} dateKey={dateKey} /> : null}
      {tab === 'meals' ? <MealsList meal={meal} dateKey={dateKey} /> : null}
    </View>
  );
}

function useOpenItem(meal: MealType, dateKey: string) {
  const queryClient = useQueryClient();
  return (item: FoodItem) => {
    rememberFoodItem(queryClient, item);
    router.push({ pathname: '/food/item', params: { key: item.key, meal, date: dateKey } });
  };
}

/** Logs one serving of a food straight from a list. */
function useQuickLogItem(meal: MealType, dateKey: string) {
  const createFood = useCreateFoodLog();
  const log = async (item: FoodItem) => {
    haptics.tap();
    const entry = entryFromItem(item);
    try {
      await createFood.mutateAsync({ ...entry, meal, logged_on: dateKey });
      notifySuccess(`Added to ${MEAL_LABELS[meal]}`, `${entry.name} · ${entry.calories} kcal`);
    } catch (e) {
      notifyError("Couldn't add food", errorMessage(e));
    }
  };
  return { log, pending: createFood.isPending };
}

function itemSubtitle(item: FoodItem): string {
  const serving = item.servings[0];
  const kcal = nutritionFor(item, serving, 1).calories;
  return [item.brand, `${kcal} kcal`, serving.label].filter(Boolean).join(' · ');
}

function RecentList({ meal, dateKey }: FoodLibraryProps) {
  const food = useFoodLogs();
  const createFood = useCreateFoodLog();
  const recents = useMemo(() => recentFoods(food.data ?? [], 12), [food.data]);

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

  if (recents.length === 0) {
    return <Empty text="Foods you log show up here so you can add them again in one tap." />;
  }
  return (
    <Card style={styles.list}>
      {recents.map((template, i) => (
        <Row
          key={template.name}
          divider={i > 0}
          title={template.name}
          subtitle={`${template.calories} kcal${
            template.serving_label
              ? ` · ${template.servings === 1 ? '' : `${template.servings} × `}${template.serving_label}`
              : ''
          }`}
          openLabel={`Adjust ${template.name} before adding`}
          onOpen={() =>
            router.push({
              pathname: '/food/quick',
              params: {
                meal,
                date: dateKey,
                name: template.name,
                calories: String(template.calories),
                protein: template.protein_g?.toString() ?? '',
                carbs: template.carbs_g?.toString() ?? '',
                fat: template.fat_g?.toString() ?? '',
              },
            })
          }
          addLabel={`Add ${template.name} to ${MEAL_LABELS[meal]}`}
          onAdd={() => quickLog(template)}
          adding={createFood.isPending}
        />
      ))}
    </Card>
  );
}

function FavoritesList({ meal, dateKey }: FoodLibraryProps) {
  const favorites = useFavorites();
  const open = useOpenItem(meal, dateKey);
  const quick = useQuickLogItem(meal, dateKey);
  const items = useMemo(
    () =>
      (favorites.data ?? [])
        .map((f) => parseFavoriteItem(f.item))
        .filter((i): i is FoodItem => i !== null),
    [favorites.data],
  );

  if (favorites.isPending) return <Loading />;
  if (favorites.isError) return <Empty text={errorMessage(favorites.error)} />;
  if (items.length === 0) {
    return (
      <Empty text="Tap the star on any food to keep it here. Favorites log in one tap, no search needed." />
    );
  }
  return (
    <Card style={styles.list}>
      {items.map((item, i) => (
        <Row
          key={item.key}
          divider={i > 0}
          icon="star"
          iconColor={colors.warning}
          title={item.name}
          subtitle={itemSubtitle(item)}
          openLabel={`Open ${item.name}`}
          onOpen={() => open(item)}
          addLabel={`Add ${item.name} to ${MEAL_LABELS[meal]}`}
          onAdd={() => quick.log(item)}
          adding={quick.pending}
        />
      ))}
    </Card>
  );
}

function MyFoodsList({ meal, dateKey }: FoodLibraryProps) {
  const foods = useCustomFoods();
  const open = useOpenItem(meal, dateKey);
  const quick = useQuickLogItem(meal, dateKey);
  const items = useMemo(() => (foods.data ?? []).map(fromCustomFood), [foods.data]);

  return (
    <Card style={styles.list}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create a food"
        onPress={() => {
          haptics.tap();
          router.push({ pathname: '/food/custom', params: { meal, date: dateKey } });
        }}
        style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}>
        <View style={styles.createIcon}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Create food</Text>
          <Text style={styles.muted}>Homemade meals, team snacks, anything not in search</Text>
        </View>
      </Pressable>
      {foods.isPending ? (
        <Loading />
      ) : foods.isError ? (
        <Text style={styles.muted}>{errorMessage(foods.error)}</Text>
      ) : (
        items.map((item) => (
          <Row
            key={item.key}
            divider
            title={item.name}
            subtitle={itemSubtitle(item)}
            openLabel={`Open ${item.name}`}
            onOpen={() => open(item)}
            addLabel={`Add ${item.name} to ${MEAL_LABELS[meal]}`}
            onAdd={() => quick.log(item)}
            adding={quick.pending}
          />
        ))
      )}
    </Card>
  );
}

function MealsList({ meal, dateKey }: FoodLibraryProps) {
  const meals = useSavedMeals();
  const logFoods = useLogFoods();

  async function logMeal(saved: SavedMeal) {
    haptics.tap();
    const items = parseMealItems(saved.items);
    try {
      await logFoods.mutateAsync(mealToInputs(items, meal, dateKey));
      notifySuccess(
        `Added to ${MEAL_LABELS[meal]}`,
        `${saved.name} · ${mealTotals(items).calories} kcal`,
      );
    } catch (e) {
      notifyError("Couldn't add meal", errorMessage(e));
    }
  }

  if (meals.isPending) return <Loading />;
  if (meals.isError) return <Empty text={errorMessage(meals.error)} />;
  if ((meals.data ?? []).length === 0) {
    return (
      <Empty text='Save a meal you eat often, like your usual breakfast, and log it all in one tap. On the Fuel tab, tap "Save as meal" under any meal you have logged.' />
    );
  }
  return (
    <Card style={styles.list}>
      {meals.data.map((saved, i) => {
        const items = parseMealItems(saved.items);
        const totals = mealTotals(items);
        return (
          <Row
            key={saved.id}
            divider={i > 0}
            icon="restaurant-outline"
            iconColor={colors.primary}
            title={saved.name}
            subtitle={`${items.length} ${items.length === 1 ? 'food' : 'foods'} · ${totals.calories} kcal`}
            openLabel={`Open ${saved.name}`}
            onOpen={() =>
              router.push({
                pathname: '/food/meal/[id]',
                params: { id: saved.id, meal, date: dateKey },
              })
            }
            addLabel={`Add ${saved.name} to ${MEAL_LABELS[meal]}`}
            onAdd={() => logMeal(saved)}
            adding={logFoods.isPending}
          />
        );
      })}
    </Card>
  );
}

type RowProps = {
  title: string;
  subtitle: string;
  divider: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  openLabel: string;
  onOpen: () => void;
  addLabel: string;
  onAdd: () => void;
  adding: boolean;
};

function Row({
  title,
  subtitle,
  divider,
  icon,
  iconColor,
  openLabel,
  onOpen,
  addLabel,
  onAdd,
  adding,
}: RowProps) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={openLabel}
        style={styles.rowMain}
        onPress={onOpen}>
        {icon ? <Ionicons name={icon} size={16} color={iconColor} /> : null}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        hitSlop={8}
        disabled={adding}
        onPress={onAdd}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        <Ionicons name="add" size={20} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <Text style={styles.muted}>{text}</Text>
    </Card>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
  },
  createIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
  loading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
