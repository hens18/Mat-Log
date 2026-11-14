import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { missingEnvVars } from '@/lib/env';

/** Shown instead of the app when .env hasn't been filled in yet. */
export function SetupRequired() {
  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.screen}>
      <Text style={styles.title}>Connect to AWS</Text>
      <Text style={styles.body}>
        Mat Log needs its AWS backend to sign in and save weigh-ins. These environment variables are
        missing:
      </Text>
      <View style={styles.code}>
        {missingEnvVars.map((name) => (
          <Text key={name} style={styles.codeText}>
            {name}
          </Text>
        ))}
      </View>
      <Text style={styles.body}>
        Copy .env.example to .env and paste in the values printed at the end of the AWS deploy
        (docs/AWS.md), then stop Expo and run npx expo start again.
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
    fontFamily: fonts.bold,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontFamily: fonts.regular,
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
