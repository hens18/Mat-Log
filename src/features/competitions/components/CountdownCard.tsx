import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { WeightUnit } from '@/types/models';
import { fromDateKey, isSameDay } from '@/utils/dates';
import { formatRate, formatShortDate, formatWeight } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import {
  MAX_DAILY_LOSS_PERCENT,
  MAX_WEEKLY_LOSS_PERCENT,
  daysUntil,
  weighInDayKey,
  weightPlan,
  type Competition,
  type WeightPlan,
} from '../countdown';

type CountdownCardProps = {
  competition: Competition | null;
  /** The most recent weigh-in. */
  latest: { weight: number; recordedAt: string } | null;
  /** Used when the competition has no weight class of its own. */
  profileWeightClass: number | null;
  unit: WeightUnit;
  onAdd: () => void;
  onOpen: (competition: Competition) => void;
  onSeeAll: () => void;
};

/** The countdown to the next competition, front and center on Today. */
export function CountdownCard({
  competition,
  latest,
  profileWeightClass,
  unit,
  onAdd,
  onOpen,
  onSeeAll,
}: CountdownCardProps) {
  if (!competition) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add your next competition"
        onPress={() => {
          haptics.tap();
          onAdd();
        }}
        style={({ pressed }) => [styles.card, styles.empty, pressed && styles.pressed]}>
        <Ionicons name="trophy-outline" size={26} color={colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.emptyTitle}>Add your next competition</Text>
          <Text style={styles.muted}>
            Get a countdown and how much you need to lose each day to make weight.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  const days = daysUntil(weighInDayKey(competition));
  const weightClass = competition.weight_class ?? profileWeightClass;
  const plan = weightPlan({ currentWeight: latest?.weight ?? null, weightClass, days });
  const weighIn = competition.weigh_in_at ? new Date(competition.weigh_in_at) : null;
  const latestDate = latest ? new Date(latest.recordedAt) : null;
  const stale = latestDate && !isSameDay(latestDate, new Date());

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(228, 87, 46, 0.22)', 'rgba(228, 87, 46, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${competition.name}, ${days <= 0 ? 'weigh-ins today' : `${days} days to weigh-ins`}. Edit competition`}
        onPress={() => onOpen(competition)}
        style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Next competition</Text>
          <Text style={styles.name} numberOfLines={1}>
            {competition.name}
          </Text>
          <Text style={styles.muted}>
            {fromDateKey(competition.starts_on).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {weighIn
              ? ` · Weigh-ins ${weighIn.toLocaleString(undefined, {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}`
              : ''}
          </Text>
        </View>
        <View style={styles.countdown}>
          <Text style={styles.days}>{days <= 0 ? '0' : days}</Text>
          <Text style={styles.daysLabel}>
            {days <= 0 ? 'weigh-ins today' : days === 1 ? 'day to go' : 'days to go'}
          </Text>
        </View>
      </Pressable>

      <View style={styles.stats}>
        <Stat
          label={stale ? `Weight · ${formatShortDate(latestDate!)}` : "Today's weight"}
          value={latest ? formatWeight(latest.weight, unit) : 'None yet'}
        />
        <Stat
          label="Weight class"
          value={weightClass ? formatWeight(weightClass, unit) : 'Not set'}
        />
        <Stat label={differenceLabel(plan)} value={differenceValue(plan, unit)} tone={tone(plan)} />
      </View>

      <PlanMessage plan={plan} unit={unit} days={days} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="All competitions"
        onPress={onSeeAll}
        hitSlop={8}
        style={styles.seeAll}>
        <Text style={styles.seeAllText}>All competitions</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function differenceLabel(plan: WeightPlan): string {
  if (plan.status === 'onWeight') return 'Under by';
  return 'To lose';
}

function differenceValue(plan: WeightPlan, unit: WeightUnit): string {
  if (plan.status === 'onWeight') return formatWeight(plan.margin, unit);
  if (plan.status === 'onPace' || plan.status === 'tooFast') return formatWeight(plan.toLose, unit);
  return 'n/a';
}

function tone(plan: WeightPlan): string {
  if (plan.status === 'onWeight') return colors.success;
  if (plan.status === 'tooFast') return colors.danger;
  if (plan.status === 'onPace') return colors.warning;
  return colors.textMuted;
}

function PlanMessage({ plan, unit, days }: { plan: WeightPlan; unit: WeightUnit; days: number }) {
  switch (plan.status) {
    case 'noWeightClass':
      return (
        <Text style={styles.message}>
          Set a weight class for this competition or in Profile to see what it takes to make weight.
        </Text>
      );
    case 'noWeight':
      return <Text style={styles.message}>Log a weigh-in to see where you stand.</Text>;
    case 'onWeight':
      return (
        <View style={[styles.banner, { backgroundColor: 'rgba(63, 178, 127, 0.14)' }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={[styles.message, styles.flex]}>
            You&apos;re on weight
            {plan.margin > 0 ? ` with ${formatWeight(plan.margin, unit)} to spare` : ''}. Keep
            eating and hydrating normally.
          </Text>
        </View>
      );
    case 'onPace':
      return (
        <View style={styles.planBlock}>
          <Text style={styles.perDay}>
            You have to lose{' '}
            <Text style={styles.perDayValue}>{formatRate(plan.perDay, unit)} per day</Text> to be on
            weight{days <= 0 ? ' today' : ''}.
          </Text>
          <Text style={styles.muted}>
            That&apos;s {plan.percentPerWeek}% of your body weight this week, within the{' '}
            {MAX_WEEKLY_LOSS_PERCENT}% weekly limit for high school wrestlers.
          </Text>
        </View>
      );
    case 'tooFast':
      return (
        <View style={styles.planBlock}>
          <Text style={styles.perDay}>
            You&apos;d have to lose{' '}
            <Text style={[styles.perDayValue, { color: colors.danger }]}>
              {formatRate(plan.perDay, unit)} per day
            </Text>{' '}
            to be on weight.
          </Text>
          <View style={[styles.banner, { backgroundColor: 'rgba(255, 107, 107, 0.12)' }]}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <Text style={[styles.message, styles.flex]}>
              {plan.reason === 'daily'
                ? `That's more than ${MAX_DAILY_LOSS_PERCENT}% of your body weight in one day, which means cutting water.`
                : `That's ${plan.percentPerWeek}% of your body weight a week. High school rules cap weight loss at ${MAX_WEEKLY_LOSS_PERCENT}% a week (${formatWeight(plan.maxPerWeek, unit)} for you).`}{' '}
              Talk to your coach or athletic trainer about your weight class instead of cutting
              faster.
            </Text>
          </View>
        </View>
      );
  }
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    overflow: 'hidden',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  name: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  countdown: {
    alignItems: 'center',
    minWidth: 92,
  },
  days: {
    fontSize: 64,
    lineHeight: 66,
    fontFamily: fonts.display,
    color: colors.text,
  },
  daysLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fonts.display,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  planBlock: {
    gap: spacing.sm,
  },
  perDay: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  perDayValue: {
    fontFamily: fonts.extrabold,
    color: colors.warning,
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
});
