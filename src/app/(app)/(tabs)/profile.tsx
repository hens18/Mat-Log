import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { parseWeight } from '@/features/weigh-ins/kind';
import type { Profile, WeightUnit } from '@/types/models';
import { confirm } from '@/utils/confirm';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifyError, notifySuccess } from '@/utils/notify';

const UNIT_OPTIONS = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
] as const;

export default function ProfileScreen() {
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (profile.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{errorMessage(profile.error)}</Text>
        <Button title="Try again" variant="secondary" onPress={() => profile.refetch()} />
      </View>
    );
  }
  return <ProfileForm profile={profile.data} />;
}

const numberText = (value: number | null) => (value === null ? '' : String(value));

function ProfileForm({ profile }: { profile: Profile }) {
  const { session, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [unit, setUnit] = useState<WeightUnit>(profile.weight_unit);
  const [weightClass, setWeightClass] = useState(numberText(profile.weight_class));
  const [goalWeight, setGoalWeight] = useState(numberText(profile.goal_weight));
  const [error, setError] = useState<string | null>(null);

  function optionalWeight(input: string, label: string): number | null | undefined {
    if (!input.trim()) return null;
    const value = parseWeight(input);
    if (value === null) {
      setError(`${label} must be a number, like 150`);
      return undefined;
    }
    return value;
  }

  async function handleSave() {
    setError(null);
    const weight_class = optionalWeight(weightClass, 'Weight class');
    if (weight_class === undefined) return;
    const goal_weight = optionalWeight(goalWeight, 'Goal weight');
    if (goal_weight === undefined) return;

    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        weight_unit: unit,
        weight_class,
        goal_weight,
      });
      notifySuccess('Profile saved');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleDeleteAccount() {
    haptics.warning();
    const ok = await confirm(
      'Delete your account?',
      'This permanently deletes your account and every weigh-in, practice, and reflection. It cannot be undone.',
      'Delete account',
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteAccount();
      notifySuccess('Account deleted');
    } catch (e) {
      setDeleting(false);
      notifyError("Couldn't delete your account", errorMessage(e));
    }
  }

  async function handleSignOut() {
    if (await confirm('Sign out?', 'You can sign back in any time.', 'Sign out')) {
      await signOut();
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About you</Text>
          <TextField
            label="Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            maxLength={80}
            autoComplete="name"
          />
          <View style={styles.weights}>
            <View style={styles.weightField}>
              <TextField
                label={`Weight class (${unit})`}
                value={weightClass}
                onChangeText={setWeightClass}
                keyboardType="decimal-pad"
                placeholder="150"
              />
            </View>
            <View style={styles.weightField}>
              <TextField
                label={`Goal weight (${unit})`}
                value={goalWeight}
                onChangeText={setGoalWeight}
                keyboardType="decimal-pad"
                placeholder="149"
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <SegmentedControl
            accessibilityLabel="Weight unit"
            options={UNIT_OPTIONS}
            value={unit}
            onChange={setUnit}
          />
          {unit !== profile.weight_unit ? (
            <Text style={styles.warning}>
              This changes the label only. Weights you already logged keep their numbers and will
              show as {unit}.
            </Text>
          ) : null}
        </Card>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Save profile" onPress={handleSave} loading={updateProfile.isPending} />

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.muted}>Signed in as {session?.user.email}</Text>
          <Button title="Sign out" variant="secondary" onPress={handleSignOut} />
          <Button
            title="Delete account"
            variant="ghost"
            textColor={colors.danger}
            onPress={handleDeleteAccount}
            loading={deleting}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  weights: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  weightField: {
    flex: 1,
  },
  warning: {
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 19,
    color: colors.textMuted,
  },
  muted: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
