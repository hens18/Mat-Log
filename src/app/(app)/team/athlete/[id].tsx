import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { MAX_DAILY_LOSS_PERCENT, MAX_WEEKLY_LOSS_PERCENT } from '@/features/competitions/countdown';
import { useAthleteData, useRemoveMember, useRoster } from '@/features/team/hooks';
import { buildRoster, lastWeighInLabel } from '@/features/team/roster';
import { TrendChart } from '@/features/weigh-ins/components/TrendChart';
import { buildTrend, type TrendRange } from '@/features/weigh-ins/trend';
import { confirm } from '@/utils/confirm';
import { fromDateKey } from '@/utils/dates';
import {
  errorMessage,
  formatDateTime,
  formatRate,
  formatShortDate,
  formatWeight,
} from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

const RANGES = [
  { value: 'day', label: 'Last 7 days' },
  { value: 'week', label: 'Weekly' },
] as const;

const KIND: Record<string, string> = {
  morning: 'Morning',
  pre_practice: 'Pre-practice',
  post_practice: 'Post-practice',
  night: 'Night',
};

/** A coach's read-only view of one wrestler. */
export default function AthleteScreen() {
  const { id, team } = useLocalSearchParams<{ id: string; team: string }>();
  const roster = useRoster(team);
  const data = useAthleteData(id);
  const remove = useRemoveMember();
  const [range, setRange] = useState<TrendRange>('day');
  const member = roster.data?.members.find((m) => m.user_id === id);

  const row = useMemo(
    () => (member && data.data ? buildRoster({ members: [member], ...data.data })[0] : null),
    [member, data.data],
  );
  const points = useMemo(
    () =>
      buildTrend(
        (data.data?.weighIns ?? []).map((w) => ({ weight: w.weight, recordedAt: w.recorded_at })),
        range,
      ),
    [data.data, range],
  );

  if (roster.isPending || data.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!member || !row || !data.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          {data.error ? errorMessage(data.error) : 'This wrestler is no longer on your team.'}
        </Text>
        <Button title="Back to roster" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const unit = row.unit;
  const { plan } = row;
  const recentWeighIns = [...data.data.weighIns].reverse().slice(0, 10);

  async function handleRemove() {
    haptics.warning();
    const ok = await confirm(
      `Remove ${row!.name}?`,
      'They will leave the team and you will stop seeing their data. They can rejoin with the team code.',
      'Remove',
    );
    if (!ok) return;
    try {
      await remove.mutateAsync({ teamId: team, userId: id });
      notifySuccess(`Removed ${row!.name}`);
      router.back();
    } catch (e) {
      notifyError("Couldn't remove wrestler", errorMessage(e));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: row.name }} />

      <Card style={styles.section}>
        <View style={styles.stats}>
          <Stat
            label={lastWeighInLabel(row.daysSinceWeighIn)}
            value={row.latest ? formatWeight(row.latest.weight, unit) : 'None'}
          />
          <Stat
            label="Weight class"
            value={row.weightClass ? formatWeight(row.weightClass, unit) : 'Not set'}
          />
          <Stat
            label="Last 7 days"
            value={
              row.weekChange == null
                ? 'n/a'
                : `${row.weekChange > 0 ? '+' : ''}${formatWeight(row.weekChange, unit)}`
            }
          />
        </View>
        {row.next ? (
          <View style={styles.plan}>
            <Text style={styles.planTitle}>
              {row.next.name}:{' '}
              {row.next.days <= 0 ? 'weigh-ins today' : `${row.next.days} days to weigh-ins`}
            </Text>
            {plan.status === 'onPace' ? (
              <Text style={styles.body}>
                Needs to lose {formatWeight(plan.toLose, unit)}, about{' '}
                {formatRate(plan.perDay, unit)} per day. Within the {MAX_WEEKLY_LOSS_PERCENT}%
                weekly limit.
              </Text>
            ) : plan.status === 'tooFast' ? (
              <View style={[styles.banner, styles.bannerDanger]}>
                <Text style={styles.body}>
                  Needs {formatWeight(plan.toLose, unit)} in {Math.max(1, row.next.days)}{' '}
                  {row.next.days === 1 ? 'day' : 'days'} ({formatRate(plan.perDay, unit)} per day).{' '}
                  {plan.reason === 'daily'
                    ? `That's more than ${MAX_DAILY_LOSS_PERCENT}% of body weight in a day.`
                    : `That's ${plan.percentPerWeek}% of body weight a week, over the ${MAX_WEEKLY_LOSS_PERCENT}% limit.`}{' '}
                  Worth a conversation about weight class.
                </Text>
              </View>
            ) : plan.status === 'onWeight' ? (
              <Text style={[styles.body, { color: colors.success }]}>
                On weight
                {plan.margin > 0 ? ` with ${formatWeight(plan.margin, unit)} to spare` : ''}.
              </Text>
            ) : (
              <Text style={styles.body}>
                {plan.status === 'noWeight' ? 'No weigh-ins yet.' : 'No weight class set.'}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.muted}>No upcoming competitions on their calendar.</Text>
        )}
      </Card>

      <SegmentedControl
        accessibilityLabel="Chart range"
        options={RANGES}
        value={range}
        onChange={setRange}
      />
      <Card>
        {points.length > 0 ? (
          <TrendChart points={points} range={range} unit={unit} goalWeight={row.weightClass} />
        ) : (
          <Text style={styles.muted}>No weigh-ins in this range.</Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Recent weigh-ins</Text>
        {recentWeighIns.length === 0 ? (
          <Text style={styles.muted}>None in the last 90 days.</Text>
        ) : null}
        {recentWeighIns.map((w, i) => (
          <View key={w.id} style={[styles.listRow, i > 0 && styles.divider]}>
            <View style={styles.flex}>
              <Text style={styles.listTitle}>{formatWeight(w.weight, unit)}</Text>
              <Text style={styles.muted} numberOfLines={2}>
                {KIND[w.kind] ?? w.kind} · {formatDateTime(new Date(w.recorded_at))}
                {w.note ? ` · ${w.note}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Practices, last 30 days</Text>
        {data.data.practices.length === 0 ? (
          <Text style={styles.muted}>No practices logged.</Text>
        ) : null}
        {data.data.practices.map((p, i) => (
          <View key={p.id} style={[styles.listRow, i > 0 && styles.divider]}>
            <View style={styles.flex}>
              <Text style={styles.listTitle}>{formatShortDate(fromDateKey(p.practice_date))}</Text>
              <Text style={styles.muted}>
                {[
                  p.duration_minutes ? `${p.duration_minutes} min` : null,
                  p.intensity ? `intensity ${p.intensity}/5` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No details'}
              </Text>
            </View>
            <Text style={styles.lost}>
              {p.weight_lost != null ? `-${formatWeight(p.weight_lost, unit)}` : ''}
            </Text>
          </View>
        ))}
      </Card>

      <Button
        title="Remove from team"
        variant="ghost"
        textColor={colors.danger}
        onPress={handleRemove}
        loading={remove.isPending}
      />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
    maxWidth: 720,
    alignSelf: 'center',
  },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 22, lineHeight: 26, fontFamily: fonts.display, color: colors.text },
  statLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  plan: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  planTitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  banner: { padding: spacing.sm + 4, borderRadius: radius.md },
  bannerDanger: { backgroundColor: 'rgba(255, 107, 107, 0.12)' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  flex: { flex: 1, gap: 2 },
  listTitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  lost: { fontSize: 16, fontFamily: fonts.display, color: colors.warning },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.text },
  muted: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted },
});
