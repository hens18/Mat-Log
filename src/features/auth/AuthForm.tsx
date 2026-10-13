import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { errorMessage } from '@/utils/format';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type AuthFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
  /** Resolves with an optional notice to show (e.g. "check your email"). */
  onSubmit: (email: string, password: string) => Promise<string | void>;
  footerText: string;
  footerLinkLabel: string;
  footerHref: Href;
};

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  passwordAutoComplete,
  onSubmit,
  footerText,
  footerLinkLabel,
  footerHref,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const message = await onSubmit(trimmedEmail, password);
      if (message) setNotice(message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

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
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={passwordAutoComplete}
              textContentType={passwordAutoComplete === 'new-password' ? 'newPassword' : 'password'}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            {notice ? (
              <Text accessibilityRole="alert" style={styles.notice}>
                {notice}
              </Text>
            ) : null}

            <Button title={submitLabel} onPress={handleSubmit} loading={submitting} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{footerText} </Text>
            <Link href={footerHref} replace style={styles.footerLink}>
              {footerLinkLabel}
            </Link>
          </View>
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    fontSize: 14,
    color: colors.danger,
  },
  notice: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
