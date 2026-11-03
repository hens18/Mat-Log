import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { previewTeam, type TeamPreview } from '@/features/team/api';
import { useJoinTeam } from '@/features/team/hooks';
import { normalizeJoinCode } from '@/features/team/roster';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifySuccess } from '@/utils/notify';

const SHARED = [
  'Weigh-ins, with their notes',
  'Practices, including weights before and after',
  'Competitions and weigh-in times',
  'Your name, weight class, and goal weight',
];
const PRIVATE = [
  'Food log and nutrition',
  'Hydration and drinks',
  'Birth year, sex, and calorie goal',
];

/** Enter a code, see exactly what the coach will see, then agree to join. */
export default function JoinTeamScreen() {
  const join = useJoinTeam();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<TeamPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    const normalized = normalizeJoinCode(code);
    if (normalized.length !== 8)
      return setError('Team codes are 8 letters and numbers, like KKEC-X5F5.');
    setError(null);
    setChecking(true);
    try {
      const found = await previewTeam(normalized);
      if (!found) setError('No team has that code. Check it with your coach.');
      setPreview(found);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  }

  async function handleJoin() {
    try {
      const team = await join.mutateAsync(normalizeJoinCode(code));
      haptics.success();
      notifySuccess(`Joined ${team.team_name}`);
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
        {!preview ? (
          <>
            <Text style={styles.body}>Enter the code from your coach.</Text>
            <TextField
              label="Team code"
              value={code}
              onChangeText={(v) => {
                setCode(v);
                setError(null);
              }}
              placeholder="KKEC-X5F5"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="next"
              onSubmitEditing={handleCheck}
            />
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Button title="Continue" onPress={handleCheck} loading={checking} />
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.teamName}>{preview.team_name}</Text>
              <Text style={styles.body}>Coach: {preview.coach_name ?? 'Not named yet'}</Text>
            </View>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Your coach will see</Text>
              {SHARED.map((item) => (
                <Row key={item} icon="eye-outline" color={colors.primary} text={item} />
              ))}
            </Card>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Stays private</Text>
              {PRIVATE.map((item) => (
                <Row key={item} icon="lock-closed-outline" color={colors.success} text={item} />
              ))}
            </Card>
            <Text style={styles.muted}>
              Your coach can only see this, never change it. Leave the team any time in the Team tab
              and they lose access right away.
            </Text>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Button
              title={`Share and join ${preview.team_name}`}
              onPress={handleJoin}
              loading={join.isPending}
            />
            <Button title="Use a different code" variant="ghost" onPress={() => setPreview(null)} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({
  icon,
  color,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { gap: 2 },
  teamName: { fontSize: 26, fontFamily: fonts.bold, color: colors.text },
  card: { gap: spacing.sm },
  cardTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.text },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, color: colors.textMuted },
  muted: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular, color: colors.textMuted },
  error: { fontSize: 14, fontFamily: fonts.regular, color: colors.danger },
});
