import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

import { MEAL_COLORS, MEAL_ICONS } from '../colors';
import { MEAL_LABELS, type FoodLog, type MealType } from '../summary';

type MealCardProps = {
  meal: MealType;
  calories: number;
  entries: FoodLog[];
  onAdd: () => void;
  onSelect: (entry: FoodLog) => void;
};

function servingLine(entry: FoodLog): string | null {
  if (!entry.serving_label) return entry.brand;
  const amount = entry.servings === 1 ? '' : `${entry.servings} × `;
  return [entry.brand, `${amount}${entry.serving_label}`].filter(Boolean).join(' · ');
}

function macroLine(entry: FoodLog): string | null {
  const parts = [
    entry.protein_g != null ? `P ${entry.protein_g}g` : null,
    entry.carbs_g != null ? `C ${entry.carbs_g}g` : null,
    entry.fat_g != null ? `F ${entry.fat_g}g` : null,
  ].filter(Boolean);
  return parts.length ? parts.join('  ·  ') : null;
}

export function MealCard({ meal, calories, entries, onAdd, onSelect }: MealCardProps) {
  const color = MEAL_COLORS[meal];
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={MEAL_ICONS[meal]} size={18} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{MEAL_LABELS[meal]}</Text>
          <Text style={styles.count}>
            {entries.length === 0
              ? 'Nothing logged'
              : `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`}
          </Text>
        </View>
        <Text style={[styles.kcal, calories === 0 && styles.kcalEmpty]}>
          {calories.toLocaleString()}
          <Text style={styles.kcalUnit}> kcal</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${MEAL_LABELS[meal]}`}
          hitSlop={8}
          onPress={() => {
            haptics.tap();
            onAdd();
          }}
          style={({ pressed }) => [
            styles.add,
            { backgroundColor: color },
            pressed && styles.pressed,
          ]}>
          <Ionicons name="add" size={20} color="#0B0D11" />
        </Pressable>
      </View>

      {entries.map((entry) => {
        const macros = macroLine(entry);
        const serving = servingLine(entry);
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${entry.name}, ${entry.calories} calories`}
            onPress={() => onSelect(entry)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowText}>
              <Text style={styles.name} numberOfLines={1}>
                {entry.name}
              </Text>
              {serving ? (
                <Text style={styles.macros} numberOfLines={1}>
                  {serving}
                </Text>
              ) : null}
              {macros ? <Text style={styles.macros}>{macros}</Text> : null}
            </View>
            <Text style={styles.rowKcal}>{entry.calories}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  count: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  kcal: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.text,
  },
  kcalEmpty: {
    color: colors.textMuted,
  },
  kcalUnit: {
    fontSize: 13,
    fontFamily: fonts.displaySemibold,
    color: colors.textMuted,
  },
  add: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingLeft: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  macros: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  rowKcal: {
    fontSize: 18,
    fontFamily: fonts.displaySemibold,
    color: colors.text,
  },
});
