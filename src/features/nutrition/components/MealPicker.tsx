import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

import { MEAL_COLORS, MEAL_ICONS } from '../colors';
import { MEALS, MEAL_LABELS, type MealType } from '../summary';

type MealPickerProps = {
  value: MealType;
  onChange: (meal: MealType) => void;
};

/** 2x2 grid of meal chips, each with its icon and color. */
export function MealPicker({ value, onChange }: MealPickerProps) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Meal">
      {MEALS.map((meal) => {
        const selected = meal === value;
        const color = MEAL_COLORS[meal];
        return (
          <Pressable
            key={meal}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={MEAL_LABELS[meal]}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(meal);
            }}
            style={[
              styles.chip,
              selected && { borderColor: color, backgroundColor: `${color}22` },
            ]}>
            <Ionicons
              name={MEAL_ICONS[meal]}
              size={16}
              color={selected ? color : colors.textMuted}
            />
            <Text style={[styles.text, selected && { color: colors.text }]}>
              {MEAL_LABELS[meal]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  text: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
  },
});
