import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { colors, fonts, spacing } from "@/constants/theme";
import { PracticeRow } from "@/features/practices/components/PracticeRow";
import { usePractices } from "@/features/practices/hooks";
import { AVERAGE_WINDOW, summarizePractices } from "@/features/practices/stats";
import { useWeightUnit } from "@/features/profile/hooks";
import { errorMessage, formatShortDate, formatWeight } from "@/utils/format";

export default function PracticesScreen() {
  const unit = useWeightUnit();
  const practices = usePractices();
  const summary = useMemo(
    () => summarizePractices(practices.data ?? []),
    [practices.data],
  );

  if (practices.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (practices.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&apos;t load your practices</Text>
        <Text style={styles.muted}>{errorMessage(practices.error)}</Text>
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => practices.refetch()}
        />
      </View>
    );
  }

  const list = practices.data;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={practices.isRefetching}
            onRefresh={() => practices.refetch()}
            tintColor={colors.text}
          />
        }
      >
        <Animated.View
          entering={FadeInDown.duration(350)}
          style={styles.summary}
        >
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Practices this week</Text>
            <Text style={styles.statValue}>{summary.thisWeekCount}</Text>
            <Text style={styles.statDetail}>
              {summary.thisWeekMinutes} min on the mat
            </Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Avg lost</Text>
            <Text
              style={[
                styles.statValue,
                summary.averageWeightLost === null && styles.empty,
              ]}
            >
              {summary.averageWeightLost === null
                ? "None yet"
                : formatWeight(summary.averageWeightLost, unit)}
            </Text>
            <Text style={styles.statDetail}>
              {summary.averageSampleSize === 0
                ? "Needs pre and post weights"
                : summary.averageSampleSize === 1
                  ? "From 1 practice"
                  : `Last ${Math.min(summary.averageSampleSize, AVERAGE_WINDOW)} practices`}
            </Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Most lost</Text>
            <Text style={[styles.statValue, !summary.mostLost && styles.empty]}>
              {summary.mostLost
                ? formatWeight(summary.mostLost.value, unit)
                : "None yet"}
            </Text>
            <Text style={styles.statDetail}>
              {summary.mostLost
                ? formatShortDate(summary.mostLost.date)
                : "One practice"}
            </Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Practices</Text>
            {list.length === 0 ? (
              <EmptyState
                icon="barbell-outline"
                title="No practices yet"
                body="Log a practice with your pre and post weights to see how much you lose each session."
              />
            ) : (
              list.map((practice, i) => (
                <PracticeRow
                  key={practice.id}
                  practice={practice}
                  unit={unit}
                  showDivider={i > 0}
                  onPress={() =>
                    router.push({
                      pathname: "/practice/[id]",
                      params: { id: practice.id },
                    })
                  }
                />
              ))
            )}
          </Card>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Log practice"
          icon="add-circle"
          onPress={() => router.push("/practice/new")}
          style={styles.footerButton}
        />
      </View>
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
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 96,
    gap: spacing.md,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  summary: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    padding: spacing.sm + 4,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.text,
  },
  empty: {
    fontSize: 16,
    fontFamily: fonts.regular,
    lineHeight: 26,
    color: colors.textMuted,
  },
  statDetail: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    fontFamily: fonts.regular,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "left",
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerButton: {
    width: "100%",
    maxWidth: 688,
    alignSelf: "center",
  },
});
