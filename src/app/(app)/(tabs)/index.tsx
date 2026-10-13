import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFoodLogs } from '@/features/nutrition/hooks';
import { defaultMealForTime } from '@/features/nutrition/summary';
import { usePractices } from '@/features/practices/hooks';
import { summarizePractices } from '@/features/practices/stats';
import { useProfile } from '@/features/profile/hooks';
import { DashboardView } from '@/features/weigh-ins/components/DashboardView';
import { useWeighIns } from '@/features/weigh-ins/hooks';
import { weighInStreak } from '@/features/weigh-ins/progress';
import { toDateKey } from '@/utils/dates';
import { errorMessage } from '@/utils/format';

export default function DashboardScreen() {
  const profile = useProfile();
  const weighIns = useWeighIns();
  const practices = usePractices();
  const food = useFoodLogs();

  const snapshot = useMemo(() => {
    const today = toDateKey(new Date());
    return {
      streak: weighInStreak((weighIns.data ?? []).map((w) => w.recorded_at)),
      caloriesToday: (food.data ?? [])
        .filter((e) => e.logged_on === today)
        .reduce((sum, e) => sum + e.calories, 0),
      calorieGoal: profile.data?.calorie_goal ?? null,
      practicesThisWeek: summarizePractices(practices.data ?? []).thisWeekCount,
    };
  }, [weighIns.data, food.data, practices.data, profile.data?.calorie_goal]);

  if (weighIns.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (weighIns.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&apos;t load your weigh-ins</Text>
        <Text style={styles.errorBody}>{errorMessage(weighIns.error)}</Text>
        <Button title="Try again" variant="secondary" onPress={() => weighIns.refetch()} />
      </View>
    );
  }

  return (
    <DashboardView
      weighIns={weighIns.data}
      unit={profile.data?.weight_unit ?? 'lb'}
      goalWeight={profile.data?.goal_weight}
      displayName={profile.data?.display_name}
      snapshot={snapshot}
      refreshing={weighIns.isRefetching}
      onRefresh={() => {
        weighIns.refetch();
        practices.refetch();
        food.refetch();
      }}
      onLogWeighIn={() => router.push('/log-weigh-in')}
      onLogPractice={() => router.push('/practice/new')}
      onLogFood={() =>
        router.push({
          pathname: '/food/new',
          params: { meal: defaultMealForTime(new Date()), date: toDateKey(new Date()) },
        })
      }
      onSetGoal={() => router.navigate('/profile')}
      onSelect={(w) => router.push({ pathname: '/weigh-in/[id]', params: { id: w.id } })}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  errorBody: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
