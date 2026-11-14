import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import { KindBadge } from '@/components/KindBadge';
import type { WeighIn, WeightUnit } from '@/types/models';
import { formatDateTime, formatWeight } from '@/utils/format';

type WeighInListProps = {
  weighIns: WeighIn[];
  unit: WeightUnit;
  onSelect: (weighIn: WeighIn) => void;
};

export function WeighInList({ weighIns, unit, onSelect }: WeighInListProps) {
  return (
    <View>
      {weighIns.map((w, i) => (
        <Pressable
          key={w.id}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${formatWeight(w.weight, unit)} weigh-in`}
          onPress={() => onSelect(w)}
          style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}>
          <View style={styles.info}>
            <Text style={styles.weight}>{formatWeight(w.weight, unit)}</Text>
            <View style={styles.metaRow}>
              <KindBadge kind={w.kind} />
              <Text style={styles.meta}>{formatDateTime(new Date(w.recorded_at))}</Text>
            </View>
            {w.note ? (
              <Text style={styles.note} numberOfLines={2}>
                {w.note}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
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
  weight: {
    fontSize: 17,
    fontFamily: fonts.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  note: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text,
    marginTop: 2,
  },
});
