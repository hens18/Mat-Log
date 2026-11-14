import { router, useLocalSearchParams } from 'expo-router';
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
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import type { PracticeWithReflection } from '@/features/practices/api';
import { usePractice, useSaveReflection } from '@/features/practices/hooks';
import { ENERGY_LABELS, SCALE_OPTIONS } from '@/features/practices/labels';
import { errorMessage } from '@/utils/format';
import { notifySuccess } from '@/utils/notify';

export default function ReflectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { practice, isPending } = usePractice(id);

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!practice) {
    return (
      <View style={styles.center}>
        <Text style={styles.label}>This practice no longer exists.</Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }
  return <ReflectionForm practice={practice} />;
}

function ReflectionForm({ practice }: { practice: PracticeWithReflection }) {
  const existing = practice.practice_reflections;
  const saveReflection = useSaveReflection();
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [wentWell, setWentWell] = useState(existing?.went_well ?? '');
  const [toImprove, setToImprove] = useState(existing?.to_improve ?? '');
  const [focusNext, setFocusNext] = useState(existing?.focus_next ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const input = {
      energy,
      went_well: wentWell.trim() || null,
      to_improve: toImprove.trim() || null,
      focus_next: focusNext.trim() || null,
    };
    if (!input.energy && !input.went_well && !input.to_improve && !input.focus_next) {
      setError('Add at least one answer or an energy rating.');
      return;
    }
    setError(null);
    try {
      await saveReflection.mutateAsync({ practiceId: practice.id, input });
      notifySuccess('Reflection saved');
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
        <View style={styles.field}>
          <Text style={styles.label}>Energy{energy ? `: ${ENERGY_LABELS[energy]}` : ''}</Text>
          <SegmentedControl
            accessibilityLabel="Energy"
            options={SCALE_OPTIONS}
            value={energy ? String(energy) : ''}
            onChange={(v) => setEnergy(Number(v))}
          />
        </View>
        <TextField
          label="What went well?"
          value={wentWell}
          onChangeText={setWentWell}
          placeholder="Hit my high crotch in live goes"
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
        <TextField
          label="What do you need to improve?"
          value={toImprove}
          onChangeText={setToImprove}
          placeholder="Getting out from bottom"
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
        <TextField
          label="Focus for next practice"
          value={focusNext}
          onChangeText={setFocusNext}
          placeholder="Hand fighting, hips down on stand-ups"
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Save reflection" onPress={handleSave} loading={saveReflection.isPending} />
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
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  multiline: {
    minHeight: 88,
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
