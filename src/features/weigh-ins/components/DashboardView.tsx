import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, spacing } from '@/constants/theme';
import { WEIGH_IN_KIND_LABELS, type WeighIn, type WeightUnit } from '@/types/models';
import { formatChange, formatDateTime, formatWeight } from '@/utils/format';

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

type DashboardViewProps = {
  /** Oldest first, as returned by fetchWeighIns. */
  weighIns: WeighIn[];
  unit: WeightUnit;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLogWeighIn: () => void;
  onDelete: (weighIn: WeighIn) => void;
};

export function DashboardView({
  weighIns,
  unit,
  refreshing = false,
  onRefresh,
  onLogWeighIn,
  onDelete,
}: DashboardViewProps) {
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          ) : undefined
        }>
        <Card style={styles.hero}>
          <Text style={styles.heroLabel}>Current weight</Text>
          {latest ? (
            <>
              <Text style={styles.heroValue}>{formatWeight(latest.weight, unit)}</Text>
              <Text style={styles.heroDetail}>
                {stats.sinceLast
                  ? `${formatChange(stats.sinceLast.change, unit)} since last weigh-in`
                  : 'Your first weigh-in'}
              </Text>
              <Text style={styles.heroMeta}>
                {WEIGH_IN_KIND_LABELS[latest.kind]} · {formatDateTime(new Date(latest.recorded_at))}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.heroEmpty}>No weigh-ins yet</Text>
              <Text style={styles.heroMeta}>Log your first weigh-in to start your trend.</Text>
            </>
          )}
        </Card>

        <SegmentedControl
          accessibilityLabel="Chart range"
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
        />

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Trend</Text>
          <Text style={styles.caption}>{RANGE_CAPTIONS[range]}</Text>
          <TrendChart points={points} range={range} />
        </Card>

        <StatsGrid stats={stats} unit={unit} />

        {recent.length > 0 ? (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Recent weigh-ins</Text>
            <WeighInList weighIns={recent} unit={unit} onDelete={onDelete} />
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Log weigh-in" onPress={onLogWeighIn} style={styles.footerButton} />
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
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  hero: {
    gap: spacing.xs,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  heroValue: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  heroEmpty: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  heroDetail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  heroMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  caption: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
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
