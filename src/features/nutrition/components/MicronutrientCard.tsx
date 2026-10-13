import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

import type { MicroKey, MicroTotals } from '../micros';
import { NutrientList } from './NutrientList';

// The handful most relevant to wrestlers, shown before "Show all".
const HIGHLIGHTS: MicroKey[] = ['sodium', 'potassium', 'fiber', 'calcium', 'iron'];

export function MicronutrientCard({ data }: { data: MicroTotals }) {
  const [expanded, setExpanded] = useState(false);
  const { totals, entriesWithData, totalEntries } = data;
  const reported = Object.keys(totals).length;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Micronutrients</Text>
        <Text style={styles.caption}>% Daily Value</Text>
      </View>
      {totalEntries === 0 ? (
        <Text style={styles.muted}>Log food to see vitamins and minerals for the day.</Text>
      ) : entriesWithData === 0 ? (
        <Text style={styles.muted}>
          None of today&apos;s foods have micronutrient data. Foods picked from search or a barcode
          scan include it; quick-add entries don&apos;t.
        </Text>
      ) : (
        <>
          <NutrientList micros={totals} only={expanded ? undefined : HIGHLIGHTS} />
          {reported > HIGHLIGHTS.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                setExpanded((v) => !v);
              }}
              style={styles.toggle}>
              <Text style={styles.toggleText}>
                {expanded ? 'Show less' : `Show all ${reported} nutrients`}
              </Text>
            </Pressable>
          ) : null}
          {entriesWithData < totalEntries ? (
            <Text style={styles.muted}>
              Based on {entriesWithData} of {totalEntries} foods. Quick-add entries don&apos;t
              include micronutrients.
            </Text>
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  caption: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  toggle: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
});
