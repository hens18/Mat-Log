import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/constants/theme';

/** The branded frame shared by the signed-out screens. */
export function AuthShell({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>MAT LOG</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  link: {
    alignSelf: 'center',
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    gap: spacing.sm,
  },
  brand: {
    fontSize: 48,
    lineHeight: 50,
    fontFamily: fonts.display,
    letterSpacing: 1,
    color: colors.primary,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
