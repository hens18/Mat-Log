import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { parseRecoveryLink } from '@/features/auth/recovery';
import { errorMessage } from '@/utils/format';
import { notifySuccess } from '@/utils/notify';

const MIN_PASSWORD_LENGTH = 6;

type Stage = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const { session, startRecoverySession, updatePassword } = useAuth();
  const link = useMemo(() => parseRecoveryLink(url), [url]);
  const [recovery, setRecovery] = useState<{ done: boolean; error: string | null }>({
    done: false,
    error: null,
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasTokens = !!(link?.accessToken && link.refreshToken);
  useEffect(() => {
    if (!link?.accessToken || !link.refreshToken) return;
    startRecoverySession(link.accessToken, link.refreshToken)
      .then(() => setRecovery({ done: true, error: null }))
      .catch((e) => setRecovery({ done: true, error: errorMessage(e) }));
    // Only react to the link itself; the session changes because of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const linkError = recovery.error ?? link?.error ?? null;
  const stage: Stage = hasTokens
    ? !recovery.done
      ? 'checking'
      : recovery.error
        ? 'invalid'
        : 'ready'
    : link?.error
      ? 'invalid'
      : url === null
        ? 'checking'
        : session
          ? 'ready'
          : 'invalid';

  async function handleSave() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setError(null);
    setSaving(true);
    try {
      await updatePassword(password);
      notifySuccess('Password updated', "You're signed in.");
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
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
            <Text style={styles.title}>Choose a new password</Text>
          </View>
          {stage === 'checking' ? (
            <ActivityIndicator color={colors.primary} />
          ) : stage === 'invalid' ? (
            <View style={styles.form}>
              <Text style={styles.subtitle}>
                {linkError ?? 'This reset link is invalid or has expired.'} Request a new link to
                try again.
              </Text>
              <Button
                title="Request a new link"
                onPress={() => router.replace('/forgot-password')}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <TextField
                label="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
              <TextField
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSave}
              />
              {error ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <Button title="Save new password" onPress={handleSave} loading={saving} />
            </View>
          )}
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
});
