import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { KindBadge } from '@/components/KindBadge';
import { ProgressRing } from '@/components/ProgressRing';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { WeighIn, WeightUnit } from '@/types/models';
import { formatChange, formatDateTime, formatWeight, greeting } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import { goalStatus } from '../goal';
import { distanceToGoal, goalProgress } from '../progress';
import { buildTrend, computeStats, type TrendRange } from '../trend';
import { StatsGrid } from './StatsGrid';
import { TrendChart } from './TrendChart';
import { WeighInList } from './WeighInList';

const RANGE_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

const RANGE_CAPTIONS: Record<TrendRange, string> = {
  day: 'Every weigh-in, last 7 days',
  week: 'Weekly average, last 12 weeks',
  month: 'Monthly average, last 12 months',
};

const RECENT_COUNT = 5;

/** Staggered fade-in for each section on first render. */
const enter = (index: number) => FadeInDown.delay(index * 60).duration(350);

type IconName = ComponentProps<typeof Ionicons>['name'];

export type DaySnapshot = {
  streak: number;
  bestStreak: number;
  loggedToday: boolean;
  caloriesToday: number;
  calorieGoal: number | null;
  practicesThisWeek: number;
};

type DashboardViewProps = {
  /** Oldest first, as returned by fetchWeighIns. */
  weighIns: WeighIn[];
  unit: WeightUnit;
  displayName?: string | null;
  goalWeight?: number | null;
  snapshot: DaySnapshot;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLogWeighIn: () => void;
  onLogPractice: () => void;
  onLogFood: () => void;
  onSetGoal: () => void;
  onSelect: (weighIn: WeighIn) => void;
  /** The competition countdown, shown above everything else. */
  countdown?: React.ReactNode;
};

function QuickAction({
  icon,
  color,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${subtitle}`}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function SummaryTile({
  icon,
  color,
  label,
  value,
  unit,
  detail,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: string;
  unit?: string;
  detail?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileLabelRow}>
        <Ionicons name={icon} size={13} color={color} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={styles.tileValue}>
        {value}
        {unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
      </Text>
      {detail ? <Text style={styles.tileDetail}>{detail}</Text> : null}
    </View>
  );
}

export function DashboardView({
  weighIns,
  unit,
  displayName,
  goalWeight = null,
  snapshot,
  refreshing = false,
  onRefresh,
  onLogWeighIn,
  onLogPractice,
  onLogFood,
  onSetGoal,
  onSelect,
  countdown,
}: DashboardViewProps) {
  const [range, setRange] = useState<TrendRange>('day');

  const { points, stats, recent } = useMemo(() => {
    const readings = weighIns.map((w) => ({ weight: w.weight, recordedAt: w.recorded_at }));
    return {
      points: buildTrend(readings, range),
      stats: computeStats(readings, range),
      recent: weighIns.slice(-RECENT_COUNT).reverse(),
    };
  }, [weighIns, range]);

  const latest = recent[0];
  const start = weighIns[0];
  const firstName = displayName?.trim().split(/\s+/)[0];
  const status = latest && goalWeight ? goalStatus(latest.weight, goalWeight) : null;
  const progress =
    latest && start && goalWeight ? goalProgress(start.weight, latest.weight, goalWeight) : 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        subtitle={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        title="Today"
        actions={[{ icon: 'add', label: 'Log weigh-in', onPress: onLogWeighIn }]}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          ) : undefined
        }>
        {countdown ? <Animated.View entering={enter(0)}>{countdown}</Animated.View> : null}
        <Animated.View entering={enter(0)} style={styles.hero}>
          {latest ? (
            <>
              <ProgressRing
                size={232}
                strokeWidth={12}
                progress={goalWeight ? progress : 0}
                colorEnd="#F5B841"
                glow>
                <Text style={styles.heroLabel}>Current weight</Text>
                <Text style={styles.heroValue}>{latest.weight.toFixed(1)}</Text>
                <Text style={styles.heroUnit}>{unit}</Text>
              </ProgressRing>

              {status ? (
                <View style={styles.goalPill}>
                  <Ionicons name="flag" size={14} color={colors.primary} />
                  <Text style={styles.goalPillText}>
                    {status.state === 'at'
                      ? 'At your goal'
                      : `${formatWeight(distanceToGoal(latest.weight, goalWeight!), unit)} to goal`}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={onSetGoal}
                  style={[styles.goalPill, styles.goalPillMuted]}>
                  <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.goalPillText, styles.goalPillTextMuted]}>
                    Set a goal weight
                  </Text>
                </Pressable>
              )}

              <View style={styles.heroMeta}>
                {stats.sinceLast ? (
                  <Text style={styles.heroChange}>
                    {formatChange(stats.sinceLast.change, unit)} since last
                  </Text>
                ) : null}
                <KindBadge kind={latest.kind} />
                <Text style={styles.heroTime}>{formatDateTime(new Date(latest.recorded_at))}</Text>
              </View>
            </>
          ) : (
            <Card style={styles.emptyHero}>
              <EmptyState
                icon="scale-outline"
                title="No weigh-ins yet"
                body="Log your first weigh-in to start your trend."
              />
            </Card>
          )}
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.actions}>
          <QuickAction
            icon="scale"
            color={colors.primary}
            title="Weigh in"
            subtitle="Log weight"
            onPress={onLogWeighIn}
          />
          <QuickAction
            icon="barbell"
            color="#5B9DFF"
            title="Practice"
            subtitle="Log session"
            onPress={onLogPractice}
          />
          <QuickAction
            icon="flame"
            color="#F5B841"
            title="Food"
            subtitle="Log a meal"
            onPress={onLogFood}
          />
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <Card style={styles.summary}>
            <Text style={styles.sectionTitle}>Today&apos;s summary</Text>
            <View style={styles.tiles}>
              <SummaryTile
                icon="flame"
                color={colors.primary}
                label="Streak"
                value={String(snapshot.streak)}
                unit={snapshot.streak === 1 ? 'day' : 'days'}
                detail={
                  snapshot.streak > 0 && !snapshot.loggedToday
                    ? 'Weigh in to keep it'
                    : `Best ${snapshot.bestStreak}`
                }
              />
              <SummaryTile
                icon="restaurant"
                color="#F5B841"
                label="Calories"
                value={snapshot.caloriesToday.toLocaleString()}
                unit="kcal"
                detail={
                  snapshot.calorieGoal ? `of ${snapshot.calorieGoal.toLocaleString()}` : undefined
                }
              />
              <SummaryTile
                icon="barbell"
                color="#5B9DFF"
                label="This week"
                value={String(snapshot.practicesThisWeek)}
                unit={snapshot.practicesThisWeek === 1 ? 'practice' : 'practices'}
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <SegmentedControl
            accessibilityLabel="Chart range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trend</Text>
              {points.length > 1 ? (
                <Text style={styles.hint}>Tap the chart for details</Text>
              ) : null}
            </View>
            <Text style={styles.caption}>{RANGE_CAPTIONS[range]}</Text>
            <TrendChart points={points} range={range} unit={unit} goalWeight={goalWeight} />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(5)}>
          <StatsGrid stats={stats} unit={unit} />
        </Animated.View>

        {recent.length > 0 ? (
          <Animated.View entering={enter(6)}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Recent weigh-ins</Text>
              <WeighInList weighIns={recent} unit={unit} onSelect={onSelect} />
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_SPACE + spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyHero: {
    alignSelf: 'stretch',
  },
  heroLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  heroValue: {
    fontSize: 76,
    lineHeight: 80,
    fontFamily: fonts.display,
    color: colors.text,
  },
  heroUnit: {
    fontSize: 18,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.primary}88`,
    backgroundColor: colors.primarySoft,
  },
  goalPillMuted: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  goalPillText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  goalPillTextMuted: {
    color: colors.textMuted,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroChange: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  heroTime: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  actionPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  summary: {
    gap: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    gap: 4,
  },
  tileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  tileValue: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
  },
  tileUnit: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  tileDetail: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  caption: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});
