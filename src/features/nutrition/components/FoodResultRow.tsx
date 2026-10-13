import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';

import { nutritionFor, type FoodItem } from '../foodItem';

type FoodResultRowProps = {
  item: FoodItem;
  showDivider: boolean;
  onPress: () => void;
};

export function FoodResultRow({ item, showDivider, onPress }: FoodResultRowProps) {
  const serving = item.servings[0];
  const { calories } = nutritionFor(item, serving, 1);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.brand ? `, ${item.brand}` : ''}, ${calories} calories per ${serving.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.divider,
        pressed && styles.pressed,
      ]}>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.brand ?? 'Generic'} · {serving.label}
        </Text>
      </View>
      <View style={styles.kcal}>
        <Text style={styles.kcalValue}>{calories}</Text>
        <Text style={styles.kcalUnit}>kcal</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  kcal: {
    alignItems: 'flex-end',
  },
  kcalValue: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.text,
  },
  kcalUnit: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
