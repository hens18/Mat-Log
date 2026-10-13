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
import { TAB_BAR_SPACE } from '@/components/FloatingTabBar';
import { ScreenHeader } from '@/components/ScreenHeader';
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

type SexChoice = 'male' | 'female' | 'unset';

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unset', label: 'Not set' },
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
  const [calorieGoal, setCalorieGoal] = useState(numberText(profile.calorie_goal));
  const [sex, setSex] = useState<SexChoice>(profile.sex ?? 'unset');
  const [birthYear, setBirthYear] = useState(numberText(profile.birth_year));
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
    const calorieText = calorieGoal.trim();
    const calorie_goal = calorieText ? Number(calorieText) : null;
    if (
      calorie_goal !== null &&
      (!/^\d+$/.test(calorieText) || calorie_goal < 500 || calorie_goal > 10000)
    ) {
      setError('Daily calories must be a whole number between 500 and 10,000.');
      return;
    }

    const yearText = birthYear.trim();
    const birth_year = yearText ? Number(yearText) : null;
    const thisYear = new Date().getFullYear();
    if (
      birth_year !== null &&
      (!/^\d{4}$/.test(yearText) || birth_year < 1900 || birth_year > thisYear)
    ) {
      setError(`Birth year must be a year like 2008, no later than ${thisYear}.`);
      return;
    }

    try {
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        weight_unit: unit,
        weight_class,
        goal_weight,
        calorie_goal,
        sex: sex === 'unset' ? null : sex,
        birth_year,
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
      <ScreenHeader title="Profile" subtitle={session?.user.email ?? undefined} />
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
          <Text style={styles.sectionTitle}>Nutrition</Text>
          <TextField
            label="Daily calorie goal (kcal)"
            value={calorieGoal}
            onChangeText={setCalorieGoal}
            keyboardType="number-pad"
            placeholder="2800"
          />
          <Text style={styles.warning}>
            Set this with your coach or athletic trainer. Wrestlers in season often need more than
            they think.
          </Text>
          <View style={styles.field}>
            <Text style={styles.label}>Sex</Text>
            <SegmentedControl
              accessibilityLabel="Sex"
              options={SEX_OPTIONS}
              value={sex}
              onChange={setSex}
            />
          </View>
          <TextField
            label="Birth year"
            value={birthYear}
            onChangeText={setBirthYear}
            keyboardType="number-pad"
            placeholder="2008"
            maxLength={4}
          />
          <Text style={styles.warning}>
            Optional. Vitamin and mineral needs depend on sex and age, so these set your personal
            targets. Without them, Mat Log uses general Daily Values. Protein targets use your
            latest weigh-in.
          </Text>
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
    paddingBottom: TAB_BAR_SPACE + spacing.md,
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
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
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
