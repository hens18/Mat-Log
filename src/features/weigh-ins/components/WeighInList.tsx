import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { WEIGH_IN_KIND_LABELS, type WeighIn, type WeightUnit } from '@/types/models';
import { formatDateTime, formatWeight } from '@/utils/format';

type WeighInListProps = {
  weighIns: WeighIn[];
  unit: WeightUnit;
  onDelete: (weighIn: WeighIn) => void;
};

export function WeighInList({ weighIns, unit, onDelete }: WeighInListProps) {
  return (
    <View style={styles.list}>
      {weighIns.map((w, i) => (
        <View key={w.id} style={[styles.row, i > 0 && styles.divider]}>
          <View style={styles.info}>
            <Text style={styles.weight}>{formatWeight(w.weight, unit)}</Text>
            <Text style={styles.meta}>
              {WEIGH_IN_KIND_LABELS[w.kind]} · {formatDateTime(new Date(w.recorded_at))}
            </Text>
            {w.note ? (
              <Text style={styles.note} numberOfLines={2}>
                {w.note}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${formatWeight(w.weight, unit)} weigh-in`}
            onPress={() => onDelete(w)}
            hitSlop={8}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
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
  info: {
    flex: 1,
    gap: 2,
  },
  weight: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  note: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
  },
  delete: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.danger,
  },
});
