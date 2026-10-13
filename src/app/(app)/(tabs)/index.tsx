import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/constants/theme';
import { useProfile } from '@/features/profile/hooks';
import { DashboardView } from '@/features/weigh-ins/components/DashboardView';
import { useWeighIns } from '@/features/weigh-ins/hooks';
import { errorMessage } from '@/utils/format';

export default function DashboardScreen() {
  const profile = useProfile();
  const weighIns = useWeighIns();

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
      unit={profile.data?.weight_unit ?? 'lb'}
      goalWeight={profile.data?.goal_weight}
      refreshing={weighIns.isRefetching}
      onRefresh={() => weighIns.refetch()}
      onLogWeighIn={() => router.push('/log-weigh-in')}
      onSelect={(w) => router.push({ pathname: '/weigh-in/[id]', params: { id: w.id } })}
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
