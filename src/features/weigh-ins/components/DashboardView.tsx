import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { WEIGH_IN_KIND_LABELS, type WeighIn, type WeightUnit } from '@/types/models';
import { formatChange, formatDateTime, formatWeight, greeting } from '@/utils/format';

import { goalStatus } from '../goal';
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

const RECENT_COUNT = 10;

/** Staggered fade-in for each section on first render. */
const enter = (index: number) => FadeInDown.delay(index * 60).duration(350);

type IconName = ComponentProps<typeof Ionicons>['name'];

function changeIcon(change: number): IconName {
  if (change > 0) return 'arrow-up';
  if (change < 0) return 'arrow-down';
  return 'remove';
}

function goalText(current: number, goal: number, unit: WeightUnit): string {
  const status = goalStatus(current, goal);
  if (status.state === 'at') return 'At goal';
  const amount = formatWeight(status.difference, unit);
  return status.state === 'above' ? `${amount} above goal` : `${amount} under goal`;
}

type DashboardViewProps = {
  /** Oldest first, as returned by fetchWeighIns. */
  weighIns: WeighIn[];
  unit: WeightUnit;
  displayName?: string | null;
  goalWeight?: number | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLogWeighIn: () => void;
  onSelect: (weighIn: WeighIn) => void;
};

export function DashboardView({
  weighIns,
  unit,
  displayName,
  goalWeight = null,
  refreshing = false,
  onRefresh,
  onLogWeighIn,
  onSelect,
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
  const firstName = displayName?.trim().split(/\s+/)[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          ) : undefined
        }>
        <Animated.View entering={enter(0)} style={styles.greeting}>
          <Text style={styles.greetingTitle}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.greetingDate}>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <LinearGradient
            colors={['rgba(228, 87, 46, 0.22)', colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}>
            <Text style={styles.heroLabel}>Current weight</Text>
            {latest ? (
              <>
                <View style={styles.heroValueRow}>
                  <Text style={styles.heroValue}>{latest.weight.toFixed(1)}</Text>
                  <Text style={styles.heroUnit}>{unit}</Text>
                </View>
                <View style={styles.chips}>
                  {stats.sinceLast ? (
                    <View style={styles.chip}>
                      <Ionicons
                        name={changeIcon(stats.sinceLast.change)}
                        size={14}
                        color={colors.text}
                      />
                      <Text style={styles.chipText}>
                        {formatChange(stats.sinceLast.change, unit)} since last
                      </Text>
                    </View>
                  ) : null}
                  {goalWeight ? (
                    <View style={[styles.chip, styles.goalChip]}>
                      <Ionicons name="flag" size={13} color={colors.success} />
                      <Text style={[styles.chipText, styles.goalChipText]}>
                        {goalText(latest.weight, goalWeight, unit)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroMeta}>
                  {WEIGH_IN_KIND_LABELS[latest.kind]} ·{' '}
                  {formatDateTime(new Date(latest.recorded_at))}
                </Text>
              </>
            ) : (
              <EmptyState
                icon="scale-outline"
                title="No weigh-ins yet"
                body="Log your first weigh-in to start your trend."
              />
            )}
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <SegmentedControl
            accessibilityLabel="Chart range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
        </Animated.View>

        <Animated.View entering={enter(3)}>
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

        <Animated.View entering={enter(4)}>
          <StatsGrid stats={stats} unit={unit} />
        </Animated.View>

        {recent.length > 0 ? (
          <Animated.View entering={enter(5)}>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Recent weigh-ins</Text>
              <WeighInList weighIns={recent} unit={unit} onSelect={onSelect} />
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Log weigh-in"
          icon="add-circle"
          onPress={onLogWeighIn}
          style={styles.footerButton}
        />
      </View>
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
    paddingBottom: 100,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  greeting: {
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  greetingTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  greetingDate: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  heroLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  heroValue: {
    fontSize: 72,
    lineHeight: 76,
    fontFamily: fonts.display,
    color: colors.text,
  },
  heroUnit: {
    fontSize: 24,
    lineHeight: 40,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  goalChip: {
    backgroundColor: 'rgba(63, 178, 127, 0.14)',
  },
  goalChipText: {
    color: colors.success,
  },
  heroMeta: {
    fontSize: 13,
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
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerButton: {
    width: '100%',
    maxWidth: 688,
    alignSelf: 'center',
  },
});
