import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { useWeightUnit } from '@/features/profile/hooks';
import { DashboardView } from '@/features/weigh-ins/components/DashboardView';
import { useDeleteWeighIn, useWeighIns } from '@/features/weigh-ins/hooks';
import type { WeighIn } from '@/types/models';
import { confirm, showMessage } from '@/utils/confirm';
import { errorMessage, formatWeight } from '@/utils/format';

export default function DashboardScreen() {
  const unit = useWeightUnit();
  const weighIns = useWeighIns();
  const deleteWeighIn = useDeleteWeighIn();

  async function handleDelete(weighIn: WeighIn) {
    const ok = await confirm(
      'Delete weigh-in?',
      `${formatWeight(weighIn.weight, unit)} will be removed from your log.`,
      'Delete',
    );
    if (!ok) return;
    deleteWeighIn.mutate(weighIn.id, {
      onError: (e) => showMessage("Couldn't delete weigh-in", errorMessage(e)),
    });
  }

  if (weighIns.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (weighIns.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn&apos;t load your weigh-ins</Text>
        <Text style={styles.errorBody}>{errorMessage(weighIns.error)}</Text>
        <Button title="Try again" variant="secondary" onPress={() => weighIns.refetch()} />
      </View>
    );
  }

  return (
    <DashboardView
      weighIns={weighIns.data}
      unit={unit}
      refreshing={weighIns.isRefetching}
      onRefresh={() => weighIns.refetch()}
      onLogWeighIn={() => router.push('/log-weigh-in')}
      onDelete={handleDelete}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  errorBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
