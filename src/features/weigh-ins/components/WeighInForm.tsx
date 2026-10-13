import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  WEIGH_IN_KINDS,
  WEIGH_IN_KIND_LABELS,
  type WeighInKind,
  type WeightUnit,
} from '@/types/models';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';

import type { NewWeighIn } from '../api';
import { parseWeight, stepWeight } from '../kind';

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
  /** Shown under the weight field, e.g. where a prefilled value came from. */
  weightHint?: string;
};

const STEPS = [-1, -0.1, 0.1, 1];

export function WeighInForm({
  initialValues,
  unit,
  submitLabel,
  submitting,
  onSubmit,
  footer,
  weightHint,
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
          selectTextOnFocus
          style={styles.weightInput}
        />
        <View style={styles.steps}>
          {STEPS.map((delta) => (
            <Pressable
              key={delta}
              accessibilityRole="button"
              accessibilityLabel={`${delta > 0 ? 'Add' : 'Subtract'} ${Math.abs(delta)} ${unit}`}
              onPress={() => {
                haptics.selection();
                setWeight((w) => stepWeight(w, delta));
              }}
              style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}>
              <Text style={styles.stepText}>
                {delta > 0 ? '+' : '-'}
                {Math.abs(delta)}
              </Text>
            </Pressable>
          ))}
        </View>
        {weightHint ? <Text style={styles.hint}>{weightHint}</Text> : null}

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
    minHeight: 72,
    fontSize: 40,
    fontFamily: fonts.display,
  },
  steps: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  step: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: {
    backgroundColor: colors.surfaceRaised,
  },
  stepText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  hint: {
    marginTop: -spacing.sm,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  noteInput: {
    minHeight: 88,
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
});
