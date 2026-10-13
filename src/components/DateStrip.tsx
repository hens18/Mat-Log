import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { toDateKey } from '@/utils/dates';
import { haptics } from '@/utils/haptics';

type DateStripProps = {
  /** Oldest first. */
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
  /** Days that have data get a small dot. */
  markedKeys?: ReadonlySet<string>;
};

export function DateStrip({ days, selected, onSelect, markedKeys }: DateStripProps) {
  const selectedKey = toDateKey(selected);
  const todayKey = toDateKey(new Date());
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      // Start scrolled to the most recent day.
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {days.map((day) => {
        const key = toDateKey(day);
        const isSelected = key === selectedKey;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={day.toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            onPress={() => {
              if (isSelected) return;
              haptics.selection();
              onSelect(day);
            }}
            style={[styles.day, isSelected && styles.daySelected]}>
            <Text style={[styles.weekday, isSelected && styles.textSelected]}>
              {key === todayKey ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'short' })}
            </Text>
            <Text style={[styles.date, isSelected && styles.textSelected]}>{day.getDate()}</Text>
            <View
              style={[
                styles.dot,
                markedKeys?.has(key) && (isSelected ? styles.dotSelected : styles.dotMarked),
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  day: {
    width: 56,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekday: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  date: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.text,
  },
  textSelected: {
    color: colors.onPrimary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  dotMarked: {
    backgroundColor: colors.primary,
  },
  dotSelected: {
    backgroundColor: colors.onPrimary,
  },
});
