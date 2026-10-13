import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { HIGH_ADVICE, LOW_ADVICE, type NutrientAdvice } from '@/features/nutrition/advice';
import { useFoodLogs } from '@/features/nutrition/hooks';
import { formatMicro } from '@/features/nutrition/micros';
import { describeTargets } from '@/features/nutrition/targets';
import { useNutrientTargets, useProteinTarget } from '@/features/nutrition/useNutrientTargets';
import {
  buildWeeklyReport,
  shiftDateKey,
  type NutrientStatus,
  type WeeklyNutrient,
  type WeeklyReport,
} from '@/features/nutrition/weekly';
import { fromDateKey, toDateKey } from '@/utils/dates';
import { errorMessage, formatShortDate } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const STATUS_LABELS: Record<NutrientStatus, string> = {
  low: 'Low',
  below: 'Below target',
  onTrack: 'On track',
  over: 'Over limit',
  noTarget: 'No target',
  noData: 'No data',
};

const STATUS_COLORS: Record<NutrientStatus, string> = {
  low: colors.danger,
  below: colors.warning,
  onTrack: colors.success,
  over: colors.danger,
  noTarget: colors.textMuted,
  noData: colors.textMuted,
};

export default function WeeklyNutrientsScreen() {
  const params = useLocalSearchParams<{ end?: string }>();
  const todayKey = toDateKey(new Date());
  const endKey = params.end && params.end <= todayKey ? params.end : todayKey;
  const food = useFoodLogs();
  const targets = useNutrientTargets();
  const protein = useProteinTarget();

  const report = useMemo(
    () => buildWeeklyReport(food.data ?? [], targets, endKey, protein),
    [food.data, targets, endKey, protein],
  );

  if (food.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (food.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{errorMessage(food.error)}</Text>
        <Button title="Try again" variant="secondary" onPress={() => food.refetch()} />
      </View>
    );
  }

  function goToWeek(days: number) {
    haptics.selection();
    router.setParams({ end: shiftDateKey(endKey, days) });
  }

  // Low readings from nutrients few foods reported are more likely missing data than a real gap.
  const unrated = report.nutrients.filter(
    (n) => n.status === 'noData' || (n.sparse && (n.status === 'low' || n.status === 'below')),
  );
  const untargeted = report.nutrients.filter((n) => n.status === 'noTarget');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.weekRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => goToWeek(-7)}
          style={styles.weekButton}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.weekLabel}>
          {formatShortDate(fromDateKey(report.startKey))} to{' '}
          {formatShortDate(fromDateKey(report.endKey))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          accessibilityState={{ disabled: endKey >= todayKey }}
          disabled={endKey >= todayKey}
          onPress={() => goToWeek(7)}
          style={[styles.weekButton, endKey >= todayKey && styles.disabled]}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(300)}>
        <SummaryCard report={report} targetsLine={describeTargets(targets)} />
      </Animated.View>

      {report.entriesWithData === 0 ? null : (
        <>
          {report.protein ? (
            <Animated.View entering={FadeInDown.delay(60).duration(350)}>
              <ProteinCard protein={report.protein} />
            </Animated.View>
          ) : null}

          {report.low.length > 0 ? (
            <Section title="Running low" delay={120}>
              {report.low.map((n) => (
                <AdviceCard key={n.def.key} nutrient={n} advice={LOW_ADVICE[n.def.key]} />
              ))}
            </Section>
          ) : null}

          {report.over.length > 0 ? (
            <Section title="Over the limit" delay={180}>
              {report.over.map((n) => (
                <AdviceCard key={n.def.key} nutrient={n} advice={HIGH_ADVICE[n.def.key]} />
              ))}
            </Section>
          ) : null}

          {report.onTrack.length > 0 ? (
            <Section title="On track" delay={240}>
              <Card>
                {report.onTrack.map((n, i) => (
                  <CompactRow key={n.def.key} nutrient={n} divider={i > 0} />
                ))}
              </Card>
            </Section>
          ) : null}

          {untargeted.length > 0 ? (
            <Text style={styles.muted}>
              {untargeted
                .map((n) => `${n.def.label}: ${formatMicro(n.def, n.average)} a day`)
                .join(' · ')}{' '}
              (no official daily target)
            </Text>
          ) : null}

          {unrated.length > 0 ? (
            <Section title="Not enough data" delay={300}>
              <Card style={styles.gapSm}>
                {unrated.map((n) => (
                  <Text key={n.def.key} style={styles.muted}>
                    <Text style={styles.strong}>{n.def.label}: </Text>
                    {n.reportedBy === 0
                      ? 'none of your foods reported it.'
                      : `only ${n.reportedBy} of ${report.entriesWithData} foods reported it, so it isn't rated.`}
                  </Text>
                ))}
              </Card>
            </Section>
          ) : null}
        </>
      )}

      <Text style={styles.footnote}>
        This compares what you logged with recommended intakes. It isn&apos;t a diagnosis. Talk to a
        doctor or registered dietitian before taking supplements, and to your coach or athletic
        trainer before changing how you eat in season.
      </Text>
    </ScrollView>
  );
}

function SummaryCard({ report, targetsLine }: { report: WeeklyReport; targetsLine: string }) {
  if (report.entriesWithData === 0) {
    return (
      <Card style={styles.gapSm}>
        <Text style={styles.cardTitle}>No nutrient data this week</Text>
        <Text style={styles.muted}>
          {report.totalEntries > 0
            ? "This week's foods were all quick-add entries, which don't include micronutrients. Add foods from search or a barcode scan to see a breakdown."
            : 'Log foods from search or a barcode scan and your weekly breakdown shows up here.'}
        </Text>
      </Card>
    );
  }
  const coverage = report.entriesWithData / report.totalEntries;
  return (
    <Card style={styles.gapMd}>
      <View style={styles.counts}>
        <Count value={report.low.length} label="Low" color={colors.warning} />
        <Count value={report.over.length} label="Over" color={colors.danger} />
        <Count value={report.onTrack.length} label="On track" color={colors.success} />
      </View>
      <Text style={styles.muted}>
        Daily averages from {report.daysWithData} {report.daysWithData === 1 ? 'day' : 'days'} with
        nutrient data ({report.entriesWithData} of {report.totalEntries} foods). {targetsLine}
      </Text>
      {report.daysWithData < 3 || coverage < 0.7 ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={18} color={colors.warning} />
          <Text style={[styles.muted, styles.flex]}>
            {report.daysWithData < 3
              ? 'Log at least 3 days for a reliable weekly picture.'
              : 'Many foods this week had no nutrient data, so your real intake is likely higher than shown.'}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function Count({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.countValue, { color }]}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function ProteinCard({ protein }: { protein: NonNullable<WeeklyReport['protein']> }) {
  const { average, target, percent } = protein;
  const status: NutrientStatus = percent < 75 ? 'low' : percent < 90 ? 'below' : 'onTrack';
  return (
    <Card style={styles.gapSm}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Protein</Text>
        <StatusPill status={status} />
      </View>
      <Text style={styles.amountLine}>
        {average} g a day · target {target.grams} g
      </Text>
      <Bar percent={percent} color={STATUS_COLORS[status]} />
      <Text style={styles.muted}>
        Based on your weight ({target.weightKg} kg): 1.4 to 2.0 g per kg is the range for athletes
        in training ({target.low} to {target.high} g). Protein helps hold on to muscle while you
        manage weight.
      </Text>
    </Card>
  );
}

function AdviceCard({
  nutrient,
  advice,
}: {
  nutrient: WeeklyNutrient;
  advice: NutrientAdvice | undefined;
}) {
  const { def, average, target, percent, status, topSources } = nutrient;
  return (
    <Card style={styles.gapSm}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{def.label}</Text>
        <StatusPill status={status} />
      </View>
      <Text style={styles.amountLine}>
        {formatMicro(def, average)} a day · {percent}% of {target ? formatMicro(def, target) : ''}
      </Text>
      <Bar percent={percent ?? 0} color={STATUS_COLORS[status]} />
      {advice ? <Text style={styles.body}>{advice.why}</Text> : null}
      {topSources.length > 0 ? (
        <Text style={styles.muted}>
          {status === 'over' ? 'Biggest sources this week: ' : 'Your best sources this week: '}
          {topSources.map((s) => `${s.name} (${formatMicro(def, s.amount)})`).join(', ')}
        </Text>
      ) : null}
      {advice ? (
        <>
          <Text style={styles.subhead}>
            {status === 'over' ? 'Usual culprits' : 'Foods to add'}
          </Text>
          {advice.foods.slice(0, 5).map((food) => (
            <View key={food} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={[styles.body, styles.flex]}>{food}</Text>
            </View>
          ))}
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
            <Text style={[styles.body, styles.flex]}>{advice.tip}</Text>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function CompactRow({ nutrient, divider }: { nutrient: WeeklyNutrient; divider: boolean }) {
  const { def, average, percent } = nutrient;
  return (
    <View style={[styles.compactRow, divider && styles.divider]}>
      <Text style={[styles.body, styles.flex]}>{def.label}</Text>
      <Text style={styles.compactAmount}>{formatMicro(def, average)}</Text>
      <Text style={styles.compactPercent}>{percent}%</Text>
    </View>
  );
}

function StatusPill({ status }: { status: NutrientStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

function Bar({ percent, color }: { percent: number; color: string }) {
  return (
    <View style={styles.track}>
      <View
        style={[styles.fill, { width: `${Math.min(100, percent)}%`, backgroundColor: color }]}
      />
    </View>
  );
}

function Section({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(350)} style={styles.gapSm}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.35,
  },
  weekLabel: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  gapSm: {
    gap: spacing.sm,
  },
  gapMd: {
    gap: spacing.md,
  },
  counts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  count: {
    alignItems: 'center',
  },
  countValue: {
    fontSize: 44,
    lineHeight: 48,
    fontFamily: fonts.display,
  },
  countLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  amountLine: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  subhead: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xs,
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
  strong: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    marginTop: 8,
  },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.xs,
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
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
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  compactAmount: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  compactPercent: {
    width: 48,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.success,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
