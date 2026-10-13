import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { withDay, withTime } from '@/utils/dates';

import type { DateTimeFieldProps } from './DateTimeField.types';

// Native implementation. The web version lives in DateTimeField.web.tsx.
export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  maximumDate,
}: DateTimeFieldProps) {
  function handle(part: 'date' | 'time') {
    return (event: DateTimePickerEvent, selected?: Date) => {
      if (event.type !== 'set' || !selected) return;
      onChange(part === 'date' ? withDay(value, selected) : withTime(value, selected));
    };
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <View style={styles.row}>
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            themeVariant="dark"
            accentColor={colors.primary}
            maximumDate={maximumDate}
            onChange={handle('date')}
          />
          {mode === 'datetime' ? (
            <DateTimePicker
              value={value}
              mode="time"
              display="compact"
              themeVariant="dark"
              accentColor={colors.primary}
              onChange={handle('time')}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.row}>
          <Chip
            text={value.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            accessibilityLabel={`${label} date`}
            onPress={() =>
              DateTimePickerAndroid.open({
                value,
                mode: 'date',
                maximumDate,
                onChange: handle('date'),
              })
            }
          />
          {mode === 'datetime' ? (
            <Chip
              text={value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              accessibilityLabel={`${label} time`}
              onPress={() =>
                DateTimePickerAndroid.open({ value, mode: 'time', onChange: handle('time') })
              }
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function Chip({
  text,
  accessibilityLabel,
  onPress,
}: {
  text: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Text style={styles.chipText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 16,
    color: colors.text,
  },
});
