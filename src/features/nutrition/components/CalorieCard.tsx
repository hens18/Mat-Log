import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressRing } from '@/components/ProgressRing';
import { colors, fonts, radius, spacing } from '@/constants/theme';

import { MACRO_COLORS } from '../colors';
import { calorieProgress, macroSplit, type DaySummary } from '../summary';

type CalorieCardProps = {
  summary: DaySummary;
  goal: number | null;
  onSetGoal: () => void;
};

const formatNumber = (n: number) => Math.round(n).toLocaleString();

export function CalorieCard({ summary, goal, onSetGoal }: CalorieCardProps) {
  const progress = goal ? calorieProgress(summary.calories, goal) : null;
  const split = macroSplit(summary);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <ProgressRing
          size={168}
          strokeWidth={14}
          progress={progress?.fraction ?? 0}
          color={progress?.over ? colors.danger : colors.primary}
          colorEnd={progress?.over ? colors.danger : '#F5B841'}
          glow>
          <Text style={styles.eaten}>{formatNumber(summary.calories)}</Text>
          <Text style={styles.eatenLabel}>
            {goal ? `of ${formatNumber(goal)} kcal` : 'kcal eaten'}
          </Text>
        </ProgressRing>
        <View style={styles.side}>
          {progress ? (
            <>
              <Text style={styles.sideLabel}>{progress.over ? 'Over goal' : 'Remaining'}</Text>
              <Text style={[styles.sideValue, progress.over && { color: colors.danger }]}>
                {formatNumber(progress.remaining)}
              </Text>
              <Text style={styles.sideUnit}>kcal</Text>
            </>
          ) : (
            <>
              <Text style={styles.sideLabel}>No daily goal yet</Text>
              <Button
                title="Set goal"
                variant="secondary"
                onPress={onSetGoal}
                style={styles.goalButton}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.macros}>
        {(
          [
            ['protein', 'Protein', summary.protein],
            ['carbs', 'Carbs', summary.carbs],
            ['fat', 'Fat', summary.fat],
          ] as const
        ).map(([key, label, grams]) => (
          <View key={key} style={styles.macro}>
            <View style={styles.macroHeader}>
              <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS[key] }]} />
              <Text style={styles.macroLabel}>{label}</Text>
            </View>
            <Text style={styles.macroValue}>
              {formatNumber(grams)}
              <Text style={styles.macroUnit}> g</Text>
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(split[key] * 100)}%`, backgroundColor: MACRO_COLORS[key] },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  eaten: {
    fontSize: 44,
    lineHeight: 46,
    fontFamily: fonts.display,
    color: colors.text,
  },
  eatenLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  side: {
    flex: 1,
    gap: 2,
  },
  sideLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  sideValue: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: fonts.display,
    color: colors.text,
  },
  sideUnit: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  goalButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: 40,
  },
  macros: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macro: {
    flex: 1,
    gap: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  macroValue: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.text,
  },
  macroUnit: {
    fontSize: 14,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
