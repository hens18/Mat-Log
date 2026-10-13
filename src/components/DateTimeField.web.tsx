import type { CSSProperties } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';
import { fromDateKey, toDateKey, toTimeValue, withDay, withTime } from '@/utils/dates';

import type { DateTimeFieldProps } from './DateTimeField.types';

// The community date picker has no web support, so web uses the browser's
// own date and time inputs.
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  maximumDate,
}: DateTimeFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <input
          type="date"
          aria-label={`${label} date`}
          value={toDateKey(value)}
          max={maximumDate ? toDateKey(maximumDate) : undefined}
          onChange={(e) => {
            if (e.target.value) onChange(withDay(value, fromDateKey(e.target.value)));
          }}
          style={inputStyle}
        />
        {mode === 'datetime' ? (
          <input
            type="time"
            aria-label={`${label} time`}
            value={toTimeValue(value)}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number);
              if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
              onChange(withTime(value, new Date(2000, 0, 1, hours, minutes)));
            }}
            style={inputStyle}
          />
        ) : null}
      </View>
    </View>
  );
}

const inputStyle: CSSProperties = {
  minHeight: 46,
  padding: `0 ${spacing.md}px`,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  color: colors.text,
  fontSize: 16,
  fontFamily: fonts.regular,
  colorScheme: 'dark',
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
