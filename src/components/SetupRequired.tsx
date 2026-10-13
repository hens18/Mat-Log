import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { missingEnvVars } from '@/lib/env';

/** Shown instead of the app when .env hasn't been filled in yet. */
export function SetupRequired() {
  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.screen}>
      <Text style={styles.title}>Connect Supabase</Text>
      <Text style={styles.body}>
        Mat Log needs a Supabase project to sign in and save weigh-ins. These environment variables
        are missing:
      </Text>
      <View style={styles.code}>
        {missingEnvVars.map((name) => (
          <Text key={name} style={styles.codeText}>
            {name}
          </Text>
        ))}
      </View>
      <Text style={styles.body}>
        Copy .env.example to .env, paste in your project URL and anon key from Project Settings
        {' > '}API, then stop Expo and run npx expo start again. See the README for details.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  code: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: colors.text,
  },
});
