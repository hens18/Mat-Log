import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

type HeaderAction = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
};

/** Large title header with round icon buttons, used on each tab. */
export function ScreenHeader({ title, subtitle, actions = [] }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.text}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={6}
            onPress={() => {
              haptics.tap();
              action.onPress();
            }}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name={action.icon} size={20} color={colors.text} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md + spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.extrabold,
    letterSpacing: -0.5,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: 4,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
});
