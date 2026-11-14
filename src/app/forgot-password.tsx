import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { MIN_PASSWORD_LENGTH, PASSWORD_RULE } from '@/features/auth/AuthForm';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthShell, authStyles } from '@/features/auth/AuthShell';
import { errorMessage } from '@/utils/format';
import { notifySuccess } from '@/utils/notify';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email a code, then set a new password with it. Signing in follows automatically. */
export default function ForgotPasswordScreen() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) return setError('Enter a valid email address.');
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(trimmed);
      setSentTo(trimmed);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code from the email.');
    if (!PASSWORD_RULE.test(password)) {
      return setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters with a letter and a number.`,
      );
    }
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setError(null);
    setBusy(true);
    try {
      await confirmPasswordReset(sentTo!, code.trim(), password);
      notifySuccess('Password updated', "You're signed in.");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        sentTo
          ? `If an account exists for ${sentTo}, a 6-digit code is on its way. Enter it with your new password.`
          : "Enter your account's email and we'll send you a code to choose a new password."
      }>
      {!sentTo ? (
        <View style={authStyles.form}>
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
            <Text accessibilityRole="alert" style={authStyles.error}>
              {error}
            </Text>
          ) : null}
          <Button title="Send code" onPress={handleSend} loading={busy} />
        </View>
      ) : (
        <View style={authStyles.form}>
          <TextField
            label="Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            placeholder="123456"
            maxLength={6}
          />
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters, with a number`}
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
            onSubmitEditing={handleReset}
          />
          {error ? (
            <Text accessibilityRole="alert" style={authStyles.error}>
              {error}
            </Text>
          ) : null}
          <Button title="Save new password" onPress={handleReset} loading={busy} />
          <Button title="Send a new code" variant="ghost" onPress={() => setSentTo(null)} />
        </View>
      )}
      <Link href="/sign-in" replace style={authStyles.link}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
