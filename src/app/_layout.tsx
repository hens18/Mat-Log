import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';

import { SetupRequired } from '@/components/SetupRequired';
import { colors, fonts, radius } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { isSupabaseConfigured } from '@/lib/env';
import {
  CACHE_BUSTER,
  CACHE_MAX_AGE,
  createQueryClient,
  queryPersister,
  wireNetworkAndFocus,
} from '@/lib/queryClient';

export default function RootLayout() {
  const [queryClient] = useState(() => {
    wireNetworkAndFocus();
    return createQueryClient();
  });
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });

  // If fonts fail to load, carry on with system fonts rather than block the app.
  if (!fontsLoaded && !fontError) {
    return <Loading />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      {isSupabaseConfigured ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: CACHE_MAX_AGE,
            buster: CACHE_BUSTER,
          }}
          // Send anything logged while offline once the saved cache is back.
          onSuccess={() => queryClient.resumePausedMutations()}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PersistQueryClientProvider>
      ) : (
        <SetupRequired />
      )}
      <Toaster
        theme="dark"
        position="top-center"
        duration={2500}
        toastOptions={{
          style: styles.toast,
          titleStyle: styles.toastTitle,
          descriptionStyle: styles.toastDescription,
        }}
      />
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {/* Signed out: only the auth screens exist. */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>

      {/* Opened from the reset email. It signs the user in itself, so it can't sit
          behind either guard or it would be swapped out mid-reset. */}
      <Stack.Screen name="reset-password" />

      {/* Signed in: the app. Signing out removes these from history. */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  toast: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  toastTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  toastDescription: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
