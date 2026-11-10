import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthShell, authStyles } from '@/features/auth/AuthShell';
import { errorMessage } from '@/utils/format';

/** Enter the code Cognito emailed after sign-up. Signing in follows automatically. */
export default function ConfirmEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { confirmSignUp, resendConfirmationCode } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'confirm' | 'resend' | null>(null);

  async function handleConfirm() {
    if (!email.trim()) return setError('Enter the email you signed up with.');
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code from the email.');
    setError(null);
    setBusy('confirm');
    try {
      await confirmSignUp(email.trim(), code.trim());
      setNotice('Email confirmed. You can sign in now.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleResend() {
    setError(null);
    setBusy('resend');
    try {
      await resendConfirmationCode(email.trim());
      setNotice(`A new code is on its way to ${email.trim()}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        params.email
          ? `We sent a 6-digit code to ${params.email}. Enter it to finish creating your account.`
          : 'Enter the 6-digit code we emailed you to finish creating your account.'
      }>
      <View style={authStyles.form}>
        {!params.email ? (
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
        ) : null}
        <TextField
          label="Confirmation code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="123456"
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={handleConfirm}
        />
        {error ? (
          <Text accessibilityRole="alert" style={authStyles.error}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text accessibilityRole="alert" style={authStyles.notice}>
            {notice}
          </Text>
        ) : null}
        <Button title="Confirm email" onPress={handleConfirm} loading={busy === 'confirm'} />
        <Button
          title="Send a new code"
          variant="ghost"
          onPress={handleResend}
          loading={busy === 'resend'}
        />
      </View>
      <Link href="/sign-in" replace style={authStyles.link}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
