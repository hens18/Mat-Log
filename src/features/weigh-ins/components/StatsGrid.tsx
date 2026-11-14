import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import type { WeightUnit } from '@/types/models';
import { formatChange, formatShortDate } from '@/utils/format';

import type { DailyMove, WeightStats } from '../trend';

type StatsGridProps = {
  stats: WeightStats;
  unit: WeightUnit;
};

type StatProps = {
  label: string;
  value: string | null;
  detail: string;
};

function Stat({ label, value, detail }: StatProps) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, value === null && styles.empty]} numberOfLines={1}>
        {value ?? 'None yet'}
      </Text>
      <Text style={styles.detail}>{detail}</Text>
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
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  value: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
  },
  empty: {
    fontSize: 15,
    lineHeight: 31,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  detail: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
