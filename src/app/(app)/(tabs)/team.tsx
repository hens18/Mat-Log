import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { Membership, Team } from '@/features/team/api';
import { RosterRowView } from '@/features/team/components/RosterRowView';
import {
  useCoachedTeams,
  useLeaveTeam,
  useMyTeams,
  useRegenerateJoinCode,
  useRoster,
} from '@/features/team/hooks';
import {
  buildRoster,
  formatJoinCode,
  sortRoster,
  summarizeRoster,
  type RosterSort,
} from '@/features/team/roster';
import { confirm } from '@/utils/confirm';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

const SORTS = [
  { value: 'attention', label: 'Priority' },
  { value: 'name', label: 'Name' },
  { value: 'toLose', label: 'To lose' },
] as const;

/** Coaches see their roster here; wrestlers join a team and see who they share with. */
export default function TeamScreen() {
  const coached = useCoachedTeams();
  const memberships = useMyTeams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const teams = coached.data ?? [];
  const team = teams.find((t) => t.id === selectedId) ?? teams[0];

  const loading = coached.isPending || memberships.isPending;
  const refreshing = coached.isRefetching || memberships.isRefetching;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Team"
        subtitle={team ? 'Coach' : undefined}
        actions={[
          {
            icon: 'add',
            label: 'Join or create a team',
            onPress: () => router.push(team ? '/team/new' : '/team/join'),
          },
        ]}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                coached.refetch();
                memberships.refetch();
              }}
              tintColor={colors.text}
            />
          }>
          {coached.isError || memberships.isError ? (
            <Text style={styles.error}>{errorMessage(coached.error ?? memberships.error)}</Text>
          ) : null}

          {team ? (
            <>
              {teams.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}>
                  {teams.map((t) => (
                    <Pressable
                      key={t.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: t.id === team.id }}
                      onPress={() => {
                        haptics.selection();
                        setSelectedId(t.id);
                      }}
                      style={[styles.chip, t.id === team.id && styles.chipSelected]}>
                      <Text style={[styles.chipText, t.id === team.id && styles.chipTextSelected]}>
                        {t.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <CoachView team={team} />
            </>
          ) : null}

          {(memberships.data ?? []).length > 0 ? (
            <MembershipsCard memberships={memberships.data!} />
          ) : null}

          {!team && (memberships.data ?? []).length === 0 ? <Intro /> : null}

          {team || (memberships.data ?? []).length > 0 ? (
            <View style={styles.footerActions}>
              <Button
                title="Join a team"
                variant="secondary"
                onPress={() => router.push('/team/join')}
              />
              <Button
                title={team ? 'Create another team' : 'Create a team'}
                variant="ghost"
                onPress={() => router.push('/team/new')}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Intro() {
  return (
    <>
      <Card style={styles.introCard}>
        <Ionicons name="people" size={28} color={colors.primary} />
        <Text style={styles.title}>Wrestler: join your team</Text>
        <Text style={styles.body}>
          Enter the code your coach gives you to share your weigh-ins, practices, and competitions
          with them. Your food log stays private, and you can leave any time.
        </Text>
        <Button title="Join a team" onPress={() => router.push('/team/join')} />
      </Card>
      <Card style={styles.introCard}>
        <Ionicons name="clipboard" size={26} color={colors.warning} />
        <Text style={styles.title}>Coach: see your whole roster</Text>
        <Text style={styles.body}>
          Create a team and share its code. You&apos;ll see every wrestler&apos;s weight against
          their class, their next competition, and who is cutting too fast or hasn&apos;t weighed
          in.
        </Text>
        <Button
          title="Create a team"
          variant="secondary"
          onPress={() => router.push('/team/new')}
        />
      </Card>
    </>
  );
}

function CoachView({ team }: { team: Team }) {
  const roster = useRoster(team.id);
  const regenerate = useRegenerateJoinCode();
  const [sort, setSort] = useState<RosterSort>('attention');
  const rows = useMemo(
    () => (roster.data ? sortRoster(buildRoster(roster.data), sort) : []),
    [roster.data, sort],
  );
  const summary = summarizeRoster(rows);
  const code = formatJoinCode(team.join_code);

  async function shareCode() {
    haptics.tap();
    try {
      await Share.share({
        message: `Join ${team.name} on Mat Log: open the Team tab, tap Join a team, and enter ${code}.`,
      });
    } catch {
      // Sharing isn't available everywhere (some browsers); the code is on screen anyway.
    }
  }

  async function newCode() {
    haptics.warning();
    const ok = await confirm(
      'Make a new code?',
      `The code ${code} will stop working. Wrestlers already on ${team.name} stay on the team.`,
      'New code',
    );
    if (!ok) return;
    try {
      await regenerate.mutateAsync(team.id);
      notifySuccess('New code ready');
    } catch (e) {
      notifyError("Couldn't change the code", errorMessage(e));
    }
  }

  return (
    <>
      <Card style={styles.teamCard}>
        <Text style={styles.eyebrow}>{team.name}</Text>
        <Text style={styles.muted}>Join code</Text>
        <Text
          style={styles.code}
          selectable
          accessibilityLabel={`Join code ${code.split('').join(' ')}`}>
          {code}
        </Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              title="Share code"
              icon="share-outline"
              variant="secondary"
              onPress={shareCode}
            />
          </View>
          <View style={styles.flex}>
            <Button
              title="New code"
              variant="ghost"
              onPress={newCode}
              loading={regenerate.isPending}
            />
          </View>
        </View>
      </Card>

      {roster.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : roster.isError ? (
        <Text style={styles.error}>{errorMessage(roster.error)}</Text>
      ) : rows.length === 0 ? (
        <Card style={styles.introCard}>
          <Text style={styles.title}>No wrestlers yet</Text>
          <Text style={styles.body}>
            Share the code {code}. Wrestlers enter it in their Team tab, see exactly what
            they&apos;re sharing, and show up here once they join.
          </Text>
        </Card>
      ) : (
        <>
          <View style={styles.summary}>
            <SummaryStat value={summary.athletes} label="Wrestlers" color={colors.text} />
            <SummaryStat value={summary.onWeight} label="On weight" color={colors.success} />
            <SummaryStat value={summary.onPace} label="Cutting" color={colors.warning} />
            <SummaryStat value={summary.tooFast} label="Too fast" color={colors.danger} />
            <SummaryStat value={summary.stale} label="No weigh-in" color={colors.textMuted} />
          </View>
          <SegmentedControl
            accessibilityLabel="Sort roster"
            options={SORTS}
            value={sort}
            onChange={setSort}
          />
          <Card style={styles.list}>
            {rows.map((row, i) => (
              <RosterRowView
                key={row.userId}
                row={row}
                divider={i > 0}
                onPress={() =>
                  router.push({
                    pathname: '/team/athlete/[id]',
                    params: { id: row.userId, team: team.id },
                  })
                }
              />
            ))}
          </Card>
          <Text style={styles.footnote}>
            Read only: you can see what wrestlers log but can&apos;t change it. Weights show in each
            wrestler&apos;s own unit.
          </Text>
        </>
      )}
    </>
  );
}

function SummaryStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MembershipsCard({ memberships }: { memberships: Membership[] }) {
  const leave = useLeaveTeam();

  async function handleLeave(m: Membership) {
    haptics.warning();
    const ok = await confirm(
      `Leave ${m.team_name}?`,
      `${m.coach_name ?? 'Your coach'} will immediately stop seeing your weigh-ins, practices, and competitions. You can rejoin with the code.`,
      'Leave team',
    );
    if (!ok) return;
    try {
      await leave.mutateAsync(m.team_id);
      notifySuccess(`Left ${m.team_name}`);
    } catch (e) {
      notifyError("Couldn't leave the team", errorMessage(e));
    }
  }

  return (
    <Card style={styles.list}>
      <Text style={[styles.title, styles.listTitle]}>Your teams</Text>
      {memberships.map((m, i) => (
        <View key={m.team_id} style={[styles.membership, i > 0 && styles.divider]}>
          <View style={styles.flex}>
            <Text style={styles.name}>{m.team_name}</Text>
            <Text style={styles.muted}>
              Coach: {m.coach_name ?? 'Not named yet'}. Sees your weigh-ins, practices,
              competitions, and weight class.
            </Text>
          </View>
          <Button
            title="Leave"
            variant="ghost"
            textColor={colors.danger}
            onPress={() => handleLeave(m)}
            loading={leave.isPending && leave.variables === m.team_id}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_SPACE + spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.text,
  },
  teamCard: {
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  code: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 3,
    fontFamily: fonts.display,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    padding: spacing.sm + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: fonts.display,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  listTitle: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  membership: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  introCard: {
    gap: spacing.sm + 2,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerActions: {
    gap: spacing.sm,
  },
});
