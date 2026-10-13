import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import type { WeightUnit } from '@/types/models';
import { fromDateKey } from '@/utils/dates';
import { formatWeight } from '@/utils/format';

import type { PracticeWithReflection } from '../api';
import { INTENSITY_LABELS } from '../labels';

type PracticeRowProps = {
  practice: PracticeWithReflection;
  unit: WeightUnit;
  showDivider: boolean;
  onPress: () => void;
};

export function practiceTitle(practiceDate: string): string {
  return fromDateKey(practiceDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function PracticeRow({ practice, unit, showDivider, onPress }: PracticeRowProps) {
  const details = [
    practice.duration_minutes ? `${practice.duration_minutes} min` : null,
    practice.intensity ? INTENSITY_LABELS[practice.intensity] : null,
    practice.practice_reflections ? 'Reflection' : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Practice on ${practiceTitle(practice.practice_date)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && styles.pressed]}>
      <View style={styles.info}>
        <Text style={styles.title}>{practiceTitle(practice.practice_date)}</Text>
        <Text style={styles.meta}>{details.length ? details.join(' · ') : 'No details'}</Text>
      </View>
      {practice.weight_lost !== null ? (
        <View style={styles.lost}>
          <Text style={styles.lostValue}>{formatWeight(practice.weight_lost, unit)}</Text>
          <Text style={styles.lostLabel}>lost</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    gap: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  lost: {
    alignItems: 'flex-end',
  },
  lostValue: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.text,
  },
  lostLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
