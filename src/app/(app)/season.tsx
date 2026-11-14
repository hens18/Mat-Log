import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCompetitions } from '@/features/competitions/hooks';
import { foodCsv, practicesCsv, weighInsCsv } from '@/features/export/csv';
import { reportHtml } from '@/features/export/report';
import {
  formatMatTime,
  rangeStartKey,
  seasonLabel,
  summarizeSeason,
  type SeasonRange,
} from '@/features/export/season';
import { CAPTURE_RESULT, sharePdf, shareImage, shareTextFile } from '@/features/export/share';
import { useFoodLogs } from '@/features/nutrition/hooks';
import { usePractices } from '@/features/practices/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useWeighIns } from '@/features/weigh-ins/hooks';
import { fromDateKey, toDateKey } from '@/utils/dates';
import { errorMessage, formatShortDate, formatWeight } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

const RANGES = [
  { value: 'season', label: 'Season' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
] as const;

/** One shared empty list, so memo dependencies stay stable while data loads. */
const NONE: never[] = [];

const rows = (n: number) => `${n} ${n === 1 ? 'row' : 'rows'}`;

const CSV_UTI = 'public.comma-separated-values-text';

/** A shareable season card plus CSV and PDF exports. */
export default function SeasonScreen() {
  const { session } = useAuth();
  const profile = useProfile().data;
  const weighIns = useWeighIns().data ?? NONE;
  const practices = usePractices().data ?? NONE;
  const competitions = useCompetitions().data ?? NONE;
  const food = useFoodLogs().data ?? NONE;
  const unit = profile?.weight_unit ?? 'lb';
  const [range, setRange] = useState<SeasonRange>('season');
  const [busy, setBusy] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

  const scoped = useMemo(() => {
    const startKey = rangeStartKey(range);
    const inRange = (key: string) => !startKey || key >= startKey;
    return {
      weighIns: weighIns.filter((w) => inRange(toDateKey(new Date(w.recorded_at)))),
      practices: practices.filter((p) => inRange(p.practice_date)),
      food: food.filter((e) => inRange(e.logged_on)),
    };
  }, [weighIns, practices, food, range]);
  const summary = useMemo(
    () => summarizeSeason({ practices, weighIns, competitions }, range),
    [practices, weighIns, competitions, range],
  );
  const label = seasonLabel(range);
  const stamp = toDateKey(new Date());

  async function run(key: string, task: () => Promise<void>) {
    haptics.tap();
    setBusy(key);
    try {
      await task();
    } catch (e) {
      notifyError("Couldn't export", errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const shareCard = () =>
    run('card', async () => {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: CAPTURE_RESULT });
      await shareImage(uri);
    });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SegmentedControl
        accessibilityLabel="Summary range"
        options={RANGES}
        value={range}
        onChange={setRange}
      />

      <View ref={cardRef} collapsable={false} style={styles.shareCard}>
        <LinearGradient
          colors={['#2A1209', colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardHeader}>
          <Text style={styles.brand}>MAT LOG</Text>
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
        {profile?.display_name ? (
          <Text style={styles.athlete}>
            {profile.display_name}
            {profile.weight_class ? ` · ${formatWeight(profile.weight_class, unit)}` : ''}
          </Text>
        ) : null}
        <View style={styles.grid}>
          <Stat value={String(summary.practices)} label="Practices" />
          <Stat value={formatMatTime(summary.matMinutes)} label="Mat time" />
          <Stat
            value={summary.averageLost != null ? formatWeight(summary.averageLost, unit) : 'n/a'}
            label="Avg lost per practice"
          />
          <Stat value={`${summary.bestStreak}`} label="Best weigh-in streak (days)" />
          <Stat
            value={
              summary.weightChange
                ? `${summary.weightChange.change > 0 ? '+' : ''}${formatWeight(summary.weightChange.change, unit)}`
                : 'n/a'
            }
            label="Weight change"
          />
          <Stat value={String(summary.competitions)} label="Competitions so far" />
        </View>
        {summary.bestWeek ? (
          <Text style={styles.cardFoot}>
            Best week: {formatShortDate(fromDateKey(summary.bestWeek.start))},{' '}
            {summary.bestWeek.practices} practices, {formatMatTime(summary.bestWeek.minutes)}
          </Text>
        ) : null}
        {summary.biggestLost ? (
          <Text style={styles.cardFoot}>
            Biggest practice: {formatWeight(summary.biggestLost.amount, unit)} on{' '}
            {formatShortDate(fromDateKey(summary.biggestLost.date))}
          </Text>
        ) : null}
      </View>

      <Button
        title="Share card"
        icon="share-outline"
        onPress={shareCard}
        loading={busy === 'card'}
      />

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Export your data</Text>
        <Text style={styles.muted}>
          {label}. Spreadsheets open in Excel, Numbers, or Google Sheets. The PDF is made for your
          coach or athletic trainer.
        </Text>
        <ExportRow
          icon="scale-outline"
          title="Weigh-ins (CSV)"
          detail={rows(scoped.weighIns.length)}
          loading={busy === 'weigh'}
          onPress={() =>
            run('weigh', async () => {
              await shareTextFile(
                `mat-log-weigh-ins-${stamp}.csv`,
                weighInsCsv(scoped.weighIns, unit),
                'text/csv',
                CSV_UTI,
              );
              notifySuccess('Weigh-ins exported');
            })
          }
        />
        <ExportRow
          icon="barbell-outline"
          title="Practices (CSV)"
          detail={rows(scoped.practices.length)}
          loading={busy === 'practices'}
          onPress={() =>
            run('practices', async () => {
              await shareTextFile(
                `mat-log-practices-${stamp}.csv`,
                practicesCsv(scoped.practices, unit),
                'text/csv',
                CSV_UTI,
              );
              notifySuccess('Practices exported');
            })
          }
        />
        <ExportRow
          icon="restaurant-outline"
          title="Food log (CSV)"
          detail={`${rows(scoped.food.length)}, last 60 days at most`}
          loading={busy === 'food'}
          onPress={() =>
            run('food', async () => {
              await shareTextFile(
                `mat-log-food-${stamp}.csv`,
                foodCsv(scoped.food),
                'text/csv',
                CSV_UTI,
              );
              notifySuccess('Food log exported');
            })
          }
        />
        <ExportRow
          icon="document-text-outline"
          title="Report for your coach (PDF)"
          detail="Summary, weigh-ins, and practices"
          loading={busy === 'pdf'}
          onPress={() =>
            run('pdf', () =>
              sharePdf(
                reportHtml({
                  name: profile?.display_name ?? null,
                  email: session?.user.email ?? null,
                  rangeLabel: label,
                  unit,
                  weightClass: profile?.weight_class ?? null,
                  summary,
                  weighIns: scoped.weighIns,
                  practices: scoped.practices,
                }),
                `mat-log-report-${stamp}.pdf`,
              ),
            )
          }
        />
      </Card>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ExportRow({
  icon,
  title,
  detail,
  loading,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Export ${title}`}
      accessibilityState={{ busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.exportRow, (pressed || loading) && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.exportTitle}>{title}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      <Ionicons name="download-outline" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  shareCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 32,
    lineHeight: 34,
    fontFamily: fonts.display,
    letterSpacing: 1,
    color: colors.primary,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  athlete: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  stat: {
    width: '50%',
    gap: 2,
  },
  statValue: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: fonts.display,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  cardFoot: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  exportTitle: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
