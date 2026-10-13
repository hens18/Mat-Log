import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import {
  countdownLabel,
  daysUntil,
  weighInDayKey,
  type Competition,
} from '@/features/competitions/countdown';
import { useCompetitions } from '@/features/competitions/hooks';
import { useWeightUnit } from '@/features/profile/hooks';
import { fromDateKey } from '@/utils/dates';
import { errorMessage, formatWeight } from '@/utils/format';

/** The meet calendar: upcoming competitions first, then past ones. */
export default function CompetitionsScreen() {
  const competitions = useCompetitions();
  const unit = useWeightUnit();
  const { upcoming, past } = useMemo(() => {
    const all = competitions.data ?? [];
    return {
      upcoming: all.filter((c) => daysUntil(weighInDayKey(c)) >= 0),
      past: all.filter((c) => daysUntil(weighInDayKey(c)) < 0).reverse(),
    };
  }, [competitions.data]);

  const addButton = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add competition"
      hitSlop={12}
      onPress={() => router.push('/competitions/new')}
      style={styles.headerButton}>
      <Ionicons name="add" size={26} color={colors.primary} />
    </Pressable>
  );

  if (competitions.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerRight: addButton }} />
      {competitions.isError ? (
        <Text style={styles.muted}>{errorMessage(competitions.error)}</Text>
      ) : null}
      {upcoming.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.title}>No competitions coming up</Text>
          <Text style={styles.muted}>
            Add your duals and tournaments to get a countdown on Today and see how much you need to
            lose each day to make weight.
          </Text>
          <Button title="Add competition" onPress={() => router.push('/competitions/new')} />
        </Card>
      ) : (
        <Section title="Upcoming" items={upcoming} unit={unit} />
      )}
      {past.length > 0 ? <Section title="Past" items={past} unit={unit} muted /> : null}
    </ScrollView>
  );
}

function Section({
  title,
  items,
  unit,
  muted = false,
}: {
  title: string;
  items: Competition[];
  unit: 'lb' | 'kg';
  muted?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.list}>
        {items.map((c, i) => {
          const days = daysUntil(weighInDayKey(c));
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${c.name}`}
              onPress={() => router.push({ pathname: '/competitions/[id]', params: { id: c.id } })}
              style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.flex}>
                <Text style={[styles.name, muted && styles.mutedName]} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {fromDateKey(c.starts_on).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {c.weight_class ? ` · ${formatWeight(c.weight_class, unit)}` : ''}
                  {c.location ? ` · ${c.location}` : ''}
                </Text>
              </View>
              {!muted ? <Text style={styles.days}>{countdownLabel(days)}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </Card>
    </View>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  headerButton: {
    paddingHorizontal: spacing.md,
  },
  emptyCard: {
    gap: spacing.md,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  mutedName: {
    color: colors.textMuted,
  },
  days: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.primary,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
