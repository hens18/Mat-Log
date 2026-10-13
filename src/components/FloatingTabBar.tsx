import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Height the bar takes up, so screens can pad their content above it. */
export const TAB_BAR_SPACE = 104;

/**
 * A floating pill tab bar: icons only, with the active tab expanding into a
 * labeled pill.
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {/* Fades scrolling content out beneath the bar. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11, 13, 17, 0)', colors.background]}
        locations={[0, 0.6]}
        style={styles.fade}
      />
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const color = focused ? colors.onPrimary : colors.textMuted;

          function onPress() {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              haptics.selection();
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.item}>
              <Animated.View
                layout={LinearTransition.springify().damping(18).stiffness(180)}
                style={[styles.pill, focused && styles.pillActive]}>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                {focused ? (
                  <Animated.View entering={FadeIn.duration(180)}>
                    <Text style={styles.label} numberOfLines={1}>
                      {label}
                    </Text>
                  </Animated.View>
                ) : null}
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_SPACE + 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 8px 30px rgba(0,0,0,0.45)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      },
    }),
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.onPrimary,
  },
});
