import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { useCreateTeam } from '@/features/team/hooks';
import { formatJoinCode } from '@/features/team/roster';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifySuccess } from '@/utils/notify';

export default function NewTeamScreen() {
  const create = useCreateTeam();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return setError('Name the team, like "Central High Wrestling".');
    setError(null);
    try {
      const team = await create.mutateAsync(name.trim());
      haptics.success();
      notifySuccess('Team created', `Join code ${formatJoinCode(team.join_code)}`);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.body}>
          You&apos;ll get a code to share with your wrestlers. Once they join, the Team tab shows
          each wrestler&apos;s weight against their class, their next competition, and who needs a
          check-in. You can see what they log, but you can&apos;t change it.
        </Text>
        <TextField
          label="Team name"
          value={name}
          onChangeText={setName}
          placeholder="Central High Wrestling"
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Create team" onPress={handleCreate} loading={create.isPending} />
        <Text style={styles.muted}>
          Your name in Profile is what wrestlers see as their coach, so set it if you haven&apos;t.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, color: colors.textMuted },
  muted: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted },
  error: { fontSize: 14, fontFamily: fonts.regular, color: colors.danger },
});
