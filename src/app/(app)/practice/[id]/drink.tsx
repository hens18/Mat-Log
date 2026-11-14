import { router, useLocalSearchParams } from 'expo-router';
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
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useLogDrink } from '@/features/practices/hooks';
import {
  DRINK_PRESETS,
  formatVolume,
  parseVolume,
  volumeInputText,
  type DrinkPreset,
} from '@/features/practices/hydration';
import { useWeightUnit } from '@/features/profile/hooks';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { notifySuccess } from '@/utils/notify';

/** Log a drink after practice, starting from a common drink or typing your label. */
export default function LogDrinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const unit = useWeightUnit();
  const logDrink = useLogDrink();
  const [preset, setPreset] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [sodium, setSodium] = useState('');
  const [potassium, setPotassium] = useState('');
  const [error, setError] = useState<string | null>(null);
  const volumeUnit = unit === 'lb' ? 'oz' : 'ml';

  function applyPreset(p: DrinkPreset) {
    haptics.selection();
    setPreset(p.name);
    setName(p.name);
    setVolume(volumeInputText(p.volumeMl, unit));
    setSodium(String(p.sodiumMg));
    setPotassium(String(p.potassiumMg));
  }

  function parseMg(input: string): number | 'invalid' {
    const trimmed = input.trim();
    if (!trimmed) return 0;
    if (!/^\d+$/.test(trimmed) || Number(trimmed) > 10000) return 'invalid';
    return Number(trimmed);
  }

  async function handleSave() {
    if (!name.trim()) return setError('Pick a drink above or type a name.');
    const ml = parseVolume(volume, unit);
    if (ml === null || ml === 'invalid' || ml === 0) {
      return setError(
        `Amount must be a number in ${volumeUnit}, like ${unit === 'lb' ? '16' : '500'}.`,
      );
    }
    const sodium_mg = parseMg(sodium);
    const potassium_mg = parseMg(potassium);
    if (sodium_mg === 'invalid' || potassium_mg === 'invalid') {
      return setError('Sodium and potassium must be whole milligrams, like 270.');
    }
    setError(null);
    try {
      await logDrink.mutateAsync({
        practice_id: id,
        name: name.trim().slice(0, 80),
        volume_ml: ml,
        sodium_mg,
        potassium_mg,
      });
      haptics.success();
      notifySuccess('Drink logged', `${name.trim()} · ${formatVolume(ml, unit)}`);
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
        <Text style={styles.label}>Common drinks</Text>
        <View style={styles.presets}>
          {DRINK_PRESETS.map((p) => {
            const selected = preset === p.name;
            return (
              <Pressable
                key={p.name}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={p.name}
                onPress={() => applyPreset(p)}
                style={[styles.preset, selected && styles.presetSelected]}>
                <Text style={styles.presetName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.presetMeta}>
                  {formatVolume(p.volumeMl, unit)} · Na {p.sodiumMg}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.form}>
          <TextField label="Drink" value={name} onChangeText={setName} placeholder="Water" />
          <TextField
            label={`Amount (${volumeUnit})`}
            value={volume}
            onChangeText={setVolume}
            keyboardType="decimal-pad"
            placeholder={unit === 'lb' ? '16' : '500'}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="Sodium (mg)"
                value={sodium}
                onChangeText={setSodium}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.flex}>
              <TextField
                label="Potassium (mg)"
                value={potassium}
                onChangeText={setPotassium}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
          </View>
          <Text style={styles.muted}>
            Common drinks use typical label values. Brands vary, so change them to match yours.
          </Text>
        </Card>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title="Save drink" onPress={handleSave} loading={logDrink.isPending} />
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
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preset: {
    width: '48.5%',
    flexGrow: 1,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  presetSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  presetName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  presetMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  flex: {
    flex: 1,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.danger,
  },
});
