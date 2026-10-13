import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/utils/format';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) return setError('Enter a valid email address.');
    setError(null);
    setSending(true);
    try {
      await requestPasswordReset(trimmed);
      setSentTo(trimmed);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>MAT LOG</Text>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              {sentTo
                ? `If an account exists for ${sentTo}, a reset link is on its way. Open it on this device to choose a new password.`
                : "Enter your account's email and we'll send you a link to choose a new password."}
            </Text>
          </View>
          {!sentTo ? (
            <View style={styles.form}>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button title="Send reset link" onPress={handleSend} loading={sending} />
            </View>
          ) : (
            <Button title="Send again" variant="secondary" onPress={() => setSentTo(null)} />
          )}
          <Link href="/sign-in" replace style={styles.link}>
            Back to sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  form: {
    gap: spacing.md,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
  link: {
    alignSelf: 'center',
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
});
