import { Stack } from 'expo-router';

import { colors, fonts } from '@/constants/theme';

export default function AppLayout() {
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
      <Stack.Screen name="food/new" options={{ title: 'Log food', presentation: 'modal' }} />
      <Stack.Screen name="food/[id]" options={{ title: 'Edit food', presentation: 'modal' }} />
      <Stack.Screen
        name="practice/[id]/reflection"
        options={{ title: 'Reflection', presentation: 'modal' }}
      />
    </Stack>
  );
}
