import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { DateStrip } from '@/components/DateStrip';
import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts, spacing } from '@/constants/theme';
import { CalorieCard } from '@/features/nutrition/components/CalorieCard';
import { MealCard } from '@/features/nutrition/components/MealCard';
import { useFoodLogs } from '@/features/nutrition/hooks';
import {
  MEALS,
  defaultMealForTime,
  summarizeDay,
  type MealType,
} from '@/features/nutrition/summary';
import { useProfile } from '@/features/profile/hooks';
import { isSameDay, toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';

const STRIP_DAYS = 14;

function lastDays(count: number): Date[] {
  const today = new Date();
  return Array.from(
    { length: count },
    (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i)),
  );
}

export default function FuelScreen() {
  const profile = useProfile();
  const food = useFoodLogs();
  const [days] = useState(() => lastDays(STRIP_DAYS));
  const [selected, setSelected] = useState(() => days[days.length - 1]);

  const selectedKey = toDateKey(selected);
  const { summary, markedKeys } = useMemo(() => {
    const entries = food.data ?? [];
    return {
      summary: summarizeDay(entries.filter((e) => e.logged_on === selectedKey)),
      markedKeys: new Set(entries.map((e) => e.logged_on)),
    };
  }, [food.data, selectedKey]);

  function addFood(meal: MealType) {
    router.push({ pathname: '/food/new', params: { meal, date: selectedKey } });
  }

  const subtitle = isSameDay(selected, new Date())
    ? 'Today'
    : selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Fuel"
        subtitle={subtitle}
        actions={[
          {
            icon: 'add',
            label: 'Log food',
            onPress: () => addFood(defaultMealForTime(new Date())),
          },
        ]}
      />
      {food.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : food.isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{errorMessage(food.error)}</Text>
          <Button title="Try again" variant="secondary" onPress={() => food.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={food.isRefetching}
              onRefresh={() => food.refetch()}
              tintColor={colors.text}
            />
          }>
          <Animated.View entering={FadeInDown.duration(300)}>
            <DateStrip
              days={days}
              selected={selected}
              onSelect={setSelected}
              markedKeys={markedKeys}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(350)}>
            <CalorieCard
              summary={summary}
              goal={profile.data?.calorie_goal ?? null}
              onSetGoal={() => router.navigate('/profile')}
            />
          </Animated.View>

          {MEALS.map((meal, i) => (
            <Animated.View key={meal} entering={FadeInDown.delay(120 + i * 50).duration(350)}>
              <MealCard
                meal={meal}
                calories={summary.byMeal[meal].calories}
                entries={summary.byMeal[meal].entries}
                onAdd={() => addFood(meal)}
                onSelect={(entry) =>
                  router.push({ pathname: '/food/[id]', params: { id: entry.id } })
                }
              />
            </Animated.View>
          ))}
          <Text style={styles.footnote}>
            Fueling matters as much as cutting. Talk to your coach or an athletic trainer before
            changing how much you eat.
          </Text>
        </ScrollView>
      )}
    </View>
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
  },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_SPACE + spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  muted: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
