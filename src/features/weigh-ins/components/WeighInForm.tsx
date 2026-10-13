import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/constants/theme';
import { WEIGH_IN_KINDS, WEIGH_IN_KIND_LABELS, type WeighInKind, type WeightUnit } from '@/types/models';
import { errorMessage } from '@/utils/format';

import type { NewWeighIn } from '../api';
import { parseWeight } from '../kind';

const KIND_OPTIONS = WEIGH_IN_KINDS.map((kind) => ({
  value: kind,
  label: WEIGH_IN_KIND_LABELS[kind].replace('-practice', ''),
}));

// Allow a little clock drift, but not weigh-ins logged in the future.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export type WeighInFormValues = {
  weight: string;
  kind: WeighInKind;
  note: string;
  recordedAt: Date;
};

type WeighInFormProps = {
  initialValues: WeighInFormValues;
  unit: WeightUnit;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: NewWeighIn) => Promise<void>;
  /** Extra actions under the submit button, such as Delete. */
  footer?: React.ReactNode;
};

export function WeighInForm({
  initialValues,
  unit,
  submitLabel,
  submitting,
  onSubmit,
  footer,
}: WeighInFormProps) {
  const [weight, setWeight] = useState(initialValues.weight);
  const [kind, setKind] = useState(initialValues.kind);
  const [note, setNote] = useState(initialValues.note);
  const [recordedAt, setRecordedAt] = useState(initialValues.recordedAt);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const value = parseWeight(weight);
    if (value === null) {
      setError(`Enter your weight in ${unit}, like 149.6`);
      return;
    }
    if (recordedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      setError("Weigh-ins can't be in the future.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        weight: value,
        kind,
        note: note.trim() || null,
        recorded_at: recordedAt.toISOString(),
      });
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
          autoFocus={!initialValues.weight}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={error}
          style={styles.weightInput}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Kind</Text>
          <SegmentedControl
            accessibilityLabel="Weigh-in kind"
            options={KIND_OPTIONS}
            value={kind}
            onChange={setKind}
          />
        </View>

        <DateTimeField
          label="When"
          value={recordedAt}
          onChange={setRecordedAt}
          maximumDate={new Date()}
        />

        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ate late, hard practice, etc."
          multiline
          maxLength={500}
          style={styles.noteInput}
        />

        <Button title={submitLabel} onPress={handleSubmit} loading={submitting} />
        {footer}
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
  noteInput: {
    minHeight: 88,
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
});
