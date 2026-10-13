import { router, Stack, type Href } from 'expo-router';
import { useEffect } from 'react';

import { colors, fonts } from '@/constants/theme';
import { configureNotifications, onReminderTapped } from '@/features/practices/reminders';
import { useWidgetSync } from '@/widgets/useWidgetSync';

export default function AppLayout() {
  useWidgetSync();
  // Tapping a rehydration reminder opens its practice.
  useEffect(() => {
    configureNotifications();
    return onReminderTapped((url) => router.push(url as Href));
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semibold },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
      <Stack.Screen
        name="log-weigh-in"
        options={{ title: 'Log weigh-in', presentation: 'modal' }}
      />
      <Stack.Screen
        name="weigh-in/[id]"
        options={{ title: 'Edit weigh-in', presentation: 'modal' }}
      />
      <Stack.Screen
        name="practice/new"
        options={{ title: 'Log practice', presentation: 'modal' }}
      />
      <Stack.Screen name="practice/[id]/index" options={{ title: 'Practice' }} />
      <Stack.Screen
        name="practice/[id]/edit"
        options={{ title: 'Edit practice', presentation: 'modal' }}
      />
      <Stack.Screen name="food/new" options={{ title: 'Add food', presentation: 'modal' }} />
      <Stack.Screen name="food/item" options={{ title: 'Food' }} />
      <Stack.Screen name="food/quick" options={{ title: 'Quick add' }} />
      <Stack.Screen name="food/scan" options={{ title: 'Scan barcode' }} />
      <Stack.Screen name="season" options={{ title: 'Season summary' }} />
      <Stack.Screen name="competitions/index" options={{ title: 'Competitions' }} />
      <Stack.Screen
        name="competitions/new"
        options={{ title: 'Add competition', presentation: 'modal' }}
      />
      <Stack.Screen
        name="competitions/[id]"
        options={{ title: 'Edit competition', presentation: 'modal' }}
      />
      <Stack.Screen name="food/weekly" options={{ title: 'Weekly nutrients' }} />
      <Stack.Screen name="food/custom" options={{ title: 'Create food' }} />
      <Stack.Screen name="food/meal/[id]" options={{ title: 'Saved meal' }} />
      <Stack.Screen
        name="food/save-meal"
        options={{ title: 'Save as meal', presentation: 'modal' }}
      />
      <Stack.Screen name="food/[id]" options={{ title: 'Edit food', presentation: 'modal' }} />
      <Stack.Screen
        name="practice/[id]/drink"
        options={{ title: 'Log a drink', presentation: 'modal' }}
      />
      <Stack.Screen
        name="practice/[id]/reflection"
        options={{ title: 'Reflection', presentation: 'modal' }}
      />
    </Stack>
  );
}
