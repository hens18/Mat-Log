import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import { practiceTitle } from '@/features/practices/components/PracticeRow';
import { usePractice } from '@/features/practices/hooks';
import { ENERGY_LABELS, INTENSITY_LABELS } from '@/features/practices/labels';
import { useWeightUnit } from '@/features/profile/hooks';
import { formatWeight } from '@/utils/format';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ReflectionSection({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <View style={styles.reflectionSection}>
      <Text style={styles.reflectionTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export default function PracticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWeightUnit();
  const { practice, isPending } = usePractice(id);

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!practice) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This practice no longer exists.</Text>
        <Button
          title="Back to practices"
          variant="secondary"
          onPress={() => router.dismissTo('/practices')}
        />
      </View>
    );
  }

  const reflection = practice.practice_reflections;
  const weight = (value: number | null) =>
    value === null ? 'Not recorded' : formatWeight(value, unit);
  const params = { id: practice.id };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: practiceTitle(practice.practice_date),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push({ pathname: '/practice/[id]/edit', params })}>
              <Text style={styles.headerButton}>Edit</Text>
            </Pressable>
          ),
        }}
      />

      <Card style={styles.hero}>
        <Text style={styles.detailLabel}>Weight lost</Text>
        <Text style={styles.heroValue}>
          {practice.weight_lost === null
            ? 'Not recorded'
            : formatWeight(practice.weight_lost, unit)}
        </Text>
        {practice.weight_lost === null ? (
          <Text style={styles.muted}>Add pre and post weights to see how much you lost.</Text>
        ) : null}
      </Card>

      <Card style={styles.grid}>
        <Detail label="Pre weight" value={weight(practice.pre_weight)} />
        <Detail label="Post weight" value={weight(practice.post_weight)} />
        <Detail
          label="Duration"
          value={practice.duration_minutes ? `${practice.duration_minutes} min` : 'Not recorded'}
        />
        <Detail
          label="Intensity"
          value={
            practice.intensity
              ? `${practice.intensity}/5 · ${INTENSITY_LABELS[practice.intensity]}`
              : 'Not recorded'
          }
        />
      </Card>

      {practice.notes ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.body}>{practice.notes}</Text>
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Reflection</Text>
        {reflection ? (
          <>
            {reflection.energy ? (
              <Text style={styles.muted}>
                Energy {reflection.energy}/5 · {ENERGY_LABELS[reflection.energy]}
              </Text>
            ) : null}
            <ReflectionSection title="What went well" body={reflection.went_well} />
            <ReflectionSection title="What to improve" body={reflection.to_improve} />
            <ReflectionSection title="Focus for next practice" body={reflection.focus_next} />
            <Button
              title="Edit reflection"
              variant="secondary"
              onPress={() => router.push({ pathname: '/practice/[id]/reflection', params })}
            />
          </>
        ) : (
          <>
            <Text style={styles.muted}>
              A few lines on what went well and what to work on makes the next practice better.
            </Text>
            <Button
              title="Add reflection"
              onPress={() => router.push({ pathname: '/practice/[id]/reflection', params })}
            />
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  headerButton: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.primary,
    paddingHorizontal: spacing.md,
  },
  hero: {
    gap: spacing.xs,
  },
  heroValue: {
    fontSize: 56,
    lineHeight: 60,
    fontFamily: fonts.display,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  detail: {
    width: '50%',
    gap: 2,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  reflectionSection: {
    gap: 2,
  },
  reflectionTitle: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.regular,
    lineHeight: 22,
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
