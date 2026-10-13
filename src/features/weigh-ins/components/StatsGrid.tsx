import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import type { WeightUnit } from '@/types/models';
import { formatChange, formatShortDate } from '@/utils/format';

import type { DailyMove, WeightStats } from '../trend';

type StatsGridProps = {
  stats: WeightStats;
  unit: WeightUnit;
};

function Stat({ label, value, detail }: { label: string; value: string | null; detail?: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, value === null && styles.empty]}>{value ?? 'None yet'}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Card>
  );
}

function moveDetail(move: DailyMove): string {
  return `${formatShortDate(move.from)} to ${formatShortDate(move.to)}`;
}

export function StatsGrid({ stats, unit }: StatsGridProps) {
  const { netChange, biggestJump, biggestDrop } = stats;
  return (
    <View style={styles.grid}>
      <Stat
        label="Net change"
        value={netChange === null ? null : formatChange(netChange, unit)}
        detail={netChange === null ? 'Needs 2+ points' : 'Over this range'}
      />
      <Stat
        label="Biggest jump"
        value={biggestJump ? formatChange(biggestJump.change, unit) : null}
        detail={biggestJump ? moveDetail(biggestJump) : 'No day-to-day gain'}
      />
      <Stat
        label="Biggest drop"
        value={biggestDrop ? formatChange(biggestDrop.change, unit) : null}
        detail={biggestDrop ? moveDetail(biggestDrop) : 'No day-to-day drop'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    padding: spacing.sm + 4,
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textMuted,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
