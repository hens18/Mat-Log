import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  /** Usually a Button. */
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
