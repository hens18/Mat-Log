import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { parseWeight } from '@/features/weigh-ins/kind';
import type { WeighIn, WeightUnit } from '@/types/models';
import { toDateKey } from '@/utils/dates';
import { errorMessage, formatChange, formatWeight } from '@/utils/format';

import type { PracticeInput } from '../api';
import { INTENSITY_LABELS, SCALE_OPTIONS } from '../labels';
import { findWeighIn } from '../prefill';
import { parseDuration } from '../stats';

export type PracticeFormValues = {
  date: Date;
  duration: string;
  intensity: number | null;
  preWeight: string;
  postWeight: string;
  notes: string;
};

type PracticeFormProps = {
  initialValues: PracticeFormValues;
  unit: WeightUnit;
  /** Used to offer that day's pre/post-practice weigh-ins. */
  weighIns: readonly WeighIn[];
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: PracticeInput) => Promise<void>;
  footer?: React.ReactNode;
};

/** Empty means "not recorded"; anything else must be a valid weight. */
function parseOptionalWeight(input: string): number | null | 'invalid' {
  if (!input.trim()) return null;
  return parseWeight(input) ?? 'invalid';
}

export function PracticeForm({
  initialValues,
  unit,
  weighIns,
  submitLabel,
  submitting,
  onSubmit,
  footer,
}: PracticeFormProps) {
  const [date, setDate] = useState(initialValues.date);
  const [duration, setDuration] = useState(initialValues.duration);
  const [intensity, setIntensity] = useState(initialValues.intensity);
  const [preWeight, setPreWeight] = useState(initialValues.preWeight);
  const [postWeight, setPostWeight] = useState(initialValues.postWeight);
  const [notes, setNotes] = useState(initialValues.notes);
  const [error, setError] = useState<string | null>(null);

  const dateKey = toDateKey(date);
  const pre = parseOptionalWeight(preWeight);
  const post = parseOptionalWeight(postWeight);
  const lost = typeof pre === 'number' && typeof post === 'number' ? pre - post : null;

  // Offer to fill in weights from that day's weigh-ins.
  const suggestions = useMemo(
    () => ({
      pre: findWeighIn(weighIns, dateKey, 'pre_practice'),
      post: findWeighIn(weighIns, dateKey, 'post_practice'),
    }),
    [weighIns, dateKey],
  );
  const canUseSuggestions =
    (suggestions.pre && String(suggestions.pre.weight) !== preWeight) ||
    (suggestions.post && String(suggestions.post.weight) !== postWeight);

  async function handleSubmit() {
    const minutes = parseDuration(duration);
    if (minutes === 'invalid') {
      setError('Duration must be whole minutes between 1 and 600.');
      return;
    }
    if (pre === 'invalid' || post === 'invalid') {
      setError(`Weights must be numbers in ${unit}, like 152.4`);
      return;
    }
    setError(null);
    try {
      await onSubmit({
        practice_date: dateKey,
        duration_minutes: minutes,
        intensity,
        pre_weight: pre,
        post_weight: post,
        notes: notes.trim() || null,
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
        <DateTimeField
          label="Date"
          mode="date"
          value={date}
          onChange={setDate}
          maximumDate={new Date()}
        />

        <TextField
          label="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="90"
        />

        <View style={styles.field}>
          <Text style={styles.label}>
            Intensity{intensity ? `: ${INTENSITY_LABELS[intensity]}` : ''}
          </Text>
          <SegmentedControl
            accessibilityLabel="Intensity"
            options={SCALE_OPTIONS}
            value={intensity ? String(intensity) : ''}
            onChange={(v) => setIntensity(Number(v))}
          />
        </View>

        <View style={styles.weights}>
          <View style={styles.weightField}>
            <TextField
              label={`Pre weight (${unit})`}
              value={preWeight}
              onChangeText={setPreWeight}
              keyboardType="decimal-pad"
              placeholder="152.4"
            />
          </View>
          <View style={styles.weightField}>
            <TextField
              label={`Post weight (${unit})`}
              value={postWeight}
              onChangeText={setPostWeight}
              keyboardType="decimal-pad"
              placeholder="149.0"
            />
          </View>
        </View>

        {canUseSuggestions ? (
          <Button
            variant="secondary"
            title={`Use ${dateKey === toDateKey(new Date()) ? "today's" : "that day's"} weigh-ins (${[
              suggestions.pre && `pre ${formatWeight(suggestions.pre.weight, unit)}`,
              suggestions.post && `post ${formatWeight(suggestions.post.weight, unit)}`,
            ]
              .filter(Boolean)
              .join(', ')})`}
            onPress={() => {
              if (suggestions.pre) setPreWeight(String(suggestions.pre.weight));
              if (suggestions.post) setPostWeight(String(suggestions.post.weight));
            }}
          />
        ) : null}

        <View style={styles.lost}>
          <Text style={styles.lostLabel}>Weight lost</Text>
          <Text style={styles.lostValue}>
            {lost === null ? 'Add both weights' : formatWeight(lost, unit)}
          </Text>
          {lost !== null && lost < 0 ? (
            <Text style={styles.lostHint}>Gained {formatChange(-lost, unit)} during practice</Text>
          ) : null}
        </View>

        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Drills, live goes, conditioning..."
          multiline
          maxLength={2000}
          style={styles.notesInput}
        />

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

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
  field: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  weights: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  weightField: {
    flex: 1,
  },
  lost: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  lostLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  lostValue: {
    fontSize: 32,
    fontFamily: fonts.display,
    color: colors.text,
  },
  lostHint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  notesInput: {
    minHeight: 100,
    paddingTop: spacing.sm + 4,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
