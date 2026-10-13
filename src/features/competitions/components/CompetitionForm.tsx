import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/constants/theme';
import { parseWeight } from '@/features/weigh-ins/kind';
import type { WeightUnit } from '@/types/models';
import { toDateKey, withDay } from '@/utils/dates';
import { errorMessage } from '@/utils/format';

import type { CompetitionInput } from '../api';

export type CompetitionFormValues = {
  name: string;
  date: Date;
  /** Null when no weigh-in time is set. */
  weighInAt: Date | null;
  weightClass: string;
  location: string;
  notes: string;
};

type CompetitionFormProps = {
  initialValues: CompetitionFormValues;
  unit: WeightUnit;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (input: CompetitionInput) => Promise<void>;
  footer?: React.ReactNode;
};

/** Weigh-ins default to 7:00 AM on the event day. */
function defaultWeighIn(date: Date): Date {
  const weighIn = new Date(date);
  weighIn.setHours(7, 0, 0, 0);
  return weighIn;
}

export function CompetitionForm({
  initialValues,
  unit,
  submitLabel,
  submitting,
  onSubmit,
  footer,
}: CompetitionFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [date, setDate] = useState(initialValues.date);
  const [weighInAt, setWeighInAt] = useState(initialValues.weighInAt);
  const [weightClass, setWeightClass] = useState(initialValues.weightClass);
  const [location, setLocation] = useState(initialValues.location);
  const [notes, setNotes] = useState(initialValues.notes);
  const [error, setError] = useState<string | null>(null);

  function changeDate(next: Date) {
    setDate(next);
    // Keep the weigh-in on the same day relative to the event when the date moves.
    if (weighInAt) setWeighInAt(withDay(weighInAt, next));
  }

  async function handleSubmit() {
    if (!name.trim()) return setError('Name the competition, like "Districts".');
    const klass = weightClass.trim() ? parseWeight(weightClass) : null;
    if (weightClass.trim() && klass === null) {
      return setError(`Weight class must be a number in ${unit}, like 152.`);
    }
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        starts_on: toDateKey(date),
        weigh_in_at: weighInAt ? weighInAt.toISOString() : null,
        weight_class: klass,
        location: location.trim() || null,
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
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Districts"
          maxLength={120}
        />
        <DateTimeField label="Date" mode="date" value={date} onChange={changeDate} />

        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.label}>Weigh-in time</Text>
            <Text style={styles.muted}>
              Set it if weigh-ins are the night before or at a set time.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Set a weigh-in time"
            value={weighInAt !== null}
            onValueChange={(on) => setWeighInAt(on ? defaultWeighIn(date) : null)}
            trackColor={{ true: colors.primary, false: colors.surfaceRaised }}
          />
        </View>
        {weighInAt ? (
          <DateTimeField label="Weigh-ins" value={weighInAt} onChange={setWeighInAt} />
        ) : null}

        <TextField
          label={`Weight class (${unit})`}
          value={weightClass}
          onChangeText={setWeightClass}
          keyboardType="decimal-pad"
          placeholder="152"
        />
        <TextField
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="Central High gym"
          maxLength={120}
        />
        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Bus leaves at 6:15"
          multiline
          maxLength={2000}
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
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
