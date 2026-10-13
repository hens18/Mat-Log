import { Stack } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { confirm } from '@/utils/confirm';

function SignOutButton() {
  const { signOut } = useAuth();

  async function handlePress() {
    if (await confirm('Sign out?', 'You can sign back in any time.', 'Sign out')) {
      await signOut();
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      hitSlop={12}
      style={styles.headerButtonContainer}>
      <Text style={styles.headerButton}>Sign out</Text>
    </Pressable>
  );
}

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Mat Log', headerRight: () => <SignOutButton /> }}
      />
      <Stack.Screen
        name="log-weigh-in"
        options={{ title: 'Log weigh-in', presentation: 'modal' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButtonContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 0,
  },
  headerButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
