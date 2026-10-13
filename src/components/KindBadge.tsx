import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius } from '@/constants/theme';
import { WEIGH_IN_KIND_LABELS, type WeighInKind } from '@/types/models';

// One color per kind, like the status pills in the reference designs.
export const KIND_COLORS: Record<WeighInKind, string> = {
  morning: '#F5B841',
  pre_practice: '#5B9DFF',
  post_practice: '#E4572E',
  night: '#A78BFA',
};

export function KindBadge({ kind }: { kind: WeighInKind }) {
  const color = KIND_COLORS[kind];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{WEIGH_IN_KIND_LABELS[kind]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.semibold,
  },
});
