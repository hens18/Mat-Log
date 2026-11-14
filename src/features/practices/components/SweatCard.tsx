import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { Practice, WeightUnit } from '@/types/models';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError } from '@/utils/notify';

import { useDeleteDrink, useHydrationLogs } from '../hooks';
import { cancelRehydrationReminder } from '../reminders';
import {
  PERFORMANCE_LOSS_PERCENT,
  estimateSweat,
  formatVolume,
  sumDrinks,
  type SweatEstimate,
} from '../hydration';

type SweatCardProps = {
  practice: Practice;
  unit: WeightUnit;
};

/** Sweat loss for a practice, what it cost in electrolytes, and drinking it back. */
export function SweatCard({ practice, unit }: SweatCardProps) {
  const estimate = estimateSweat({
    preWeight: practice.pre_weight,
    postWeight: practice.post_weight,
    unit,
    fluidDuringMl: practice.fluid_during_ml,
    durationMinutes: practice.duration_minutes,
  });
  const drinks = useHydrationLogs(practice.id);
  const deleteDrink = useDeleteDrink(practice.id);
  const totals = sumDrinks(drinks.data ?? []);
  const caughtUp = !!estimate && totals.volumeMl >= estimate.targets.fluidMl;

  // No need for the reminder once the fluid target is met.
  useEffect(() => {
    if (caughtUp) cancelRehydrationReminder(practice.id);
  }, [caughtUp, practice.id]);

  if (!estimate) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Sweat and electrolytes</Text>
        <Text style={styles.muted}>
          Add pre and post weights to this practice to estimate how much you sweated, the sodium and
          potassium you lost, and how much to drink back.
        </Text>
      </Card>
    );
  }

  async function removeDrink(id: string) {
    haptics.tap();
    try {
      await deleteDrink.mutateAsync(id);
    } catch (e) {
      notifyError("Couldn't remove drink", errorMessage(e));
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Sweat and electrolytes</Text>

      <View style={styles.stats}>
        <Stat label="Sweat lost" value={formatVolume(estimate.sweatMl, unit)} />
        <Stat
          label="Sweat rate"
          value={
            estimate.sweatRateMlPerHour != null
              ? `${formatVolume(estimate.sweatRateMlPerHour, unit)}/hr`
              : 'Add duration'
          }
        />
        <Stat label="Body weight" value={`${Math.max(0, estimate.percentBodyWeight)}%`} />
      </View>

      {estimate.percentBodyWeight > PERFORMANCE_LOSS_PERCENT ? (
        <View style={styles.notice}>
          <Ionicons name="warning-outline" size={18} color={colors.warning} />
          <Text style={[styles.body, styles.flex]}>
            You lost more than {PERFORMANCE_LOSS_PERCENT}% of your body weight. Losses past this
            point hurt strength, endurance, and focus. Drink more during practice next time.
          </Text>
        </View>
      ) : null}

      <View style={styles.losses}>
        <Text style={styles.subhead}>Estimated losses</Text>
        <LossRow label="Sodium" range={estimate.sodiumMg} />
        <LossRow label="Potassium" range={estimate.potassiumMg} />
        {practice.fluid_during_ml ? (
          <Text style={styles.muted}>
            Includes {formatVolume(practice.fluid_during_ml, unit)} you drank during practice.
          </Text>
        ) : null}
      </View>

      <View style={styles.losses}>
        <Text style={styles.subhead}>Rehydration</Text>
        <Progress
          label="Fluid"
          current={formatVolume(totals.volumeMl, unit)}
          target={formatVolume(estimate.targets.fluidMl, unit)}
          ratio={estimate.targets.fluidMl ? totals.volumeMl / estimate.targets.fluidMl : 1}
        />
        <Progress
          label="Sodium"
          current={`${totals.sodiumMg.toLocaleString()} mg`}
          target={`${estimate.targets.sodiumMg.toLocaleString()} mg`}
          ratio={totals.sodiumMg / estimate.targets.sodiumMg}
        />
        <Progress
          label="Potassium"
          current={`${totals.potassiumMg.toLocaleString()} mg`}
          target={`${estimate.targets.potassiumMg.toLocaleString()} mg`}
          ratio={totals.potassiumMg / estimate.targets.potassiumMg}
        />
        <Text style={styles.muted}>{rehydrationTip(estimate, unit)}</Text>
      </View>

      {(drinks.data ?? []).length > 0 ? (
        <View>
          {drinks.data!.map((drink, i) => (
            <View key={drink.id} style={[styles.drink, i > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={styles.drinkName} numberOfLines={1}>
                  {drink.name}
                </Text>
                <Text style={styles.muted}>
                  {formatVolume(drink.volume_ml, unit)} · Na {drink.sodium_mg} mg · K{' '}
                  {drink.potassium_mg} mg
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${drink.name}`}
                hitSlop={10}
                onPress={() => removeDrink(drink.id)}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Button
        title="Log a drink"
        icon="water-outline"
        onPress={() =>
          router.push({ pathname: '/practice/[id]/drink', params: { id: practice.id } })
        }
      />
      <Text style={styles.footnote}>
        Estimates use average sweat (35 mmol/L sodium, 5 mmol/L potassium). Salty sweaters, who see
        white streaks on dark clothes, lose more. Food counts too: a salty meal covers much of the
        sodium. Never use this to plan a dehydration cut.
      </Text>
    </Card>
  );
}

function rehydrationTip(estimate: SweatEstimate, unit: WeightUnit): string {
  if (estimate.targets.fluidMl === 0) {
    return 'You drank enough during practice to cover your sweat. Replace the electrolytes with your next meal or drink.';
  }
  return `Drink about ${formatVolume(estimate.targets.fluidMl, unit)} over the next 2 to 4 hours (1.5 times the weight you lost, since you keep losing some as urine). Sip steadily rather than chugging, and include sodium so you hold on to it.`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LossRow({
  label,
  range,
}: {
  label: string;
  range: { typical: number; low: number; high: number };
}) {
  return (
    <View style={styles.lossRow}>
      <Text style={[styles.body, styles.flex]}>{label}</Text>
      <Text style={styles.lossValue}>~{range.typical.toLocaleString()} mg</Text>
      <Text style={styles.lossRange}>
        {range.low.toLocaleString()} to {range.high.toLocaleString()}
      </Text>
    </View>
  );
}

function Progress({
  label,
  current,
  target,
  ratio,
}: {
  label: string;
  current: string;
  target: string;
  ratio: number;
}) {
  const done = ratio >= 1;
  return (
    <View
      style={styles.progress}
      accessible
      accessibilityLabel={`${label}: ${current} of ${target}`}>
      <View style={styles.lossRow}>
        <Text style={[styles.body, styles.flex]}>{label}</Text>
        <Text style={styles.progressText}>
          {current} <Text style={styles.muted}>of {target}</Text>
        </Text>
        {done ? <Ionicons name="checkmark-circle" size={16} color={colors.success} /> : null}
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, Math.round(ratio * 100))}%`,
              backgroundColor: done ? colors.success : colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: fonts.display,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: 'rgba(245, 184, 65, 0.12)',
  },
  losses: {
    gap: spacing.sm,
  },
  subhead: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  lossRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lossValue: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  lossRange: {
    width: 104,
    textAlign: 'right',
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  progress: {
    gap: 6,
  },
  progressText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
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
  drink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  drinkName: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  flex: {
    flex: 1,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
