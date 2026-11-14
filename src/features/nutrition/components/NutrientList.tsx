import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

import { MICRONUTRIENTS, formatMicro, type MicroDefinition, type Micros } from '../micros';
import { percentOfTarget } from '../targets';
import { useNutrientTargets } from '../useNutrientTargets';

type NutrientListProps = {
  micros: Micros;
  /** Only show these keys, in this order (defaults to everything reported). */
  only?: MicroDefinition['key'][];
};

function barColor(def: MicroDefinition, percent: number): string {
  if (def.goal === 'target') return colors.success;
  if (percent >= 100) return colors.danger;
  if (percent >= 75) return colors.warning;
  return colors.textMuted;
}

/** Micronutrient amounts with a bar for each showing the percent of the user's target. */
export function NutrientList({ micros, only }: NutrientListProps) {
  const targets = useNutrientTargets();
  const defs = (
    only ? only.map((k) => MICRONUTRIENTS.find((d) => d.key === k)!) : MICRONUTRIENTS
  ).filter((def) => micros[def.key] != null);

  if (defs.length === 0) {
    return <Text style={styles.empty}>No micronutrient data for this food.</Text>;
  }

  return (
    <View>
      {defs.map((def, i) => {
        const amount = micros[def.key]!;
        const percent = percentOfTarget(targets.values[def.key], amount);
        return (
          <View
            key={def.key}
            style={[styles.row, i > 0 && styles.divider]}
            accessible
            accessibilityLabel={`${def.label}: ${formatMicro(def, amount)}${percent != null ? `, ${percent}% of target` : ''}`}>
            <View style={styles.top}>
              <Text style={styles.label}>{def.label}</Text>
              <Text style={styles.amount}>{formatMicro(def, amount)}</Text>
              <Text style={styles.percent}>{percent != null ? `${percent}%` : ''}</Text>
            </View>
            {percent != null ? (
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, percent)}%`,
                      backgroundColor: barColor(def, percent),
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm + 2,
    gap: 6,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  amount: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  percent: {
    width: 44,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  track: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  empty: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
