import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { formatRate, formatWeight } from '@/utils/format';

import { lastWeighInLabel, type RosterRow } from '../roster';

function statusText(row: RosterRow): { value: string; label: string; color: string } {
  const { plan, unit } = row;
  switch (plan.status) {
    case 'onWeight':
      return {
        value: 'On',
        label: plan.margin > 0 ? `${formatWeight(plan.margin, unit)} under` : 'on weight',
        color: colors.success,
      };
    case 'onPace':
      return { value: formatWeight(plan.toLose, unit), label: 'to lose', color: colors.warning };
    case 'tooFast':
      return { value: formatWeight(plan.toLose, unit), label: 'to lose', color: colors.danger };
    case 'noWeight':
      return { value: 'n/a', label: 'no weigh-in', color: colors.textMuted };
    case 'noWeightClass':
      return { value: 'n/a', label: 'no class set', color: colors.textMuted };
  }
}

/** One wrestler on the coach's roster. */
export function RosterRowView({
  row,
  divider,
  onPress,
}: {
  row: RosterRow;
  divider: boolean;
  onPress: () => void;
}) {
  const status = statusText(row);
  const { plan, unit } = row;
  const details = [
    row.latest ? formatWeight(row.latest.weight, unit) : null,
    row.weightClass ? `class ${formatWeight(row.weightClass, unit)}` : null,
    lastWeighInLabel(row.daysSinceWeighIn),
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${status.value} ${status.label}. Open details`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {details.join(' · ')}
        </Text>
        {row.next ? (
          <Text style={styles.muted} numberOfLines={1}>
            {row.next.name}{' '}
            {row.next.days <= 0
              ? 'today'
              : `in ${row.next.days} ${row.next.days === 1 ? 'day' : 'days'}`}
            {plan.status === 'onPace' || plan.status === 'tooFast'
              ? ` · ${formatRate(plan.perDay, unit)}/day`
              : ''}
          </Text>
        ) : null}
        {row.flags.length > 0 ? (
          <View style={styles.flags}>
            {row.flags.includes('tooFast') ? (
              <Flag color={colors.danger} icon="warning-outline" text="Cutting too fast" />
            ) : null}
            {row.flags.includes('noRecentWeighIn') ? (
              <Flag
                color={colors.warning}
                icon="time-outline"
                text={
                  row.daysSinceWeighIn === null
                    ? 'Never weighed in'
                    : `No weigh-in ${row.daysSinceWeighIn} days`
                }
              />
            ) : null}
            {row.flags.includes('noWeightClass') ? (
              <Flag color={colors.textMuted} icon="help-circle-outline" text="No weight class" />
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={styles.status}>
        <Text style={[styles.statusValue, { color: status.color }]}>{status.value}</Text>
        <Text style={styles.statusLabel}>{status.label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function Flag({
  color,
  icon,
  text,
}: {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={[styles.flag, { borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.flagText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  flagText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
  },
  status: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  statusValue: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fonts.display,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
});
