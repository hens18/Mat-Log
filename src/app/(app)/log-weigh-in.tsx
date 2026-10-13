import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { useWeightUnit } from '@/features/profile/hooks';
import { useCreateWeighIn } from '@/features/weigh-ins/hooks';
import { defaultKindForTime, parseWeight } from '@/features/weigh-ins/kind';
import { WEIGH_IN_KINDS, WEIGH_IN_KIND_LABELS, type WeighInKind } from '@/types/models';
import { errorMessage } from '@/utils/format';

const KIND_OPTIONS = WEIGH_IN_KINDS.map((kind) => ({
  value: kind,
  label: WEIGH_IN_KIND_LABELS[kind].replace('-practice', ''),
}));

export default function LogWeighInScreen() {
  const unit = useWeightUnit();
  const createWeighIn = useCreateWeighIn();
  const [weight, setWeight] = useState('');
  const [kind, setKind] = useState<WeighInKind>(() => defaultKindForTime(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const value = parseWeight(weight);
    if (value === null) {
      setError(`Enter your weight in ${unit}, like 149.6`);
      return;
    }
    setError(null);
    try {
      await createWeighIn.mutateAsync({
        weight: value,
        kind,
        note: note.trim() || null,
        recorded_at: new Date().toISOString(),
      });
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
        <TextField
          label={`Weight (${unit})`}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="149.6"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          error={error}
          style={styles.weightInput}
        />

        <View style={styles.field}>
          <Text style={styles.label}>When</Text>
          <SegmentedControl
            accessibilityLabel="Weigh-in kind"
            options={KIND_OPTIONS}
            value={kind}
            onChange={setKind}
          />
          <Text style={styles.hint}>{WEIGH_IN_KIND_LABELS[kind]} weigh-in, logged now.</Text>
        </View>

        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ate late, hard practice, etc."
          multiline
          maxLength={500}
          style={styles.noteInput}
        />

        <Button title="Save weigh-in" onPress={handleSave} loading={createWeighIn.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  weightInput: {
    minHeight: 64,
    fontSize: 28,
    fontWeight: '700',
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  noteInput: {
    minHeight: 88,
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
});
