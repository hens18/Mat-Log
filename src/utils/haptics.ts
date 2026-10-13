import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small wrappers so screens don't repeat platform checks. Haptics are a
// no-op on web, and a failure here should never break the action it decorates.
function run(effect: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  effect().catch(() => {});
}

export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
