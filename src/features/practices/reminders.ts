// Rehydration reminders after practice, as local notifications (no server).
// The web version in reminders.web.ts does nothing.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMIND_AFTER_SECONDS = 60 * 60;
const reminderId = (practiceId: string) => `rehydrate-${practiceId}`;

let configured = false;

/** Shows reminders as banners even while the app is open. Call once at startup. */
export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android needs a channel before it will show the permission prompt.
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Schedules a reminder an hour from now to keep drinking after practice.
 * Replaces any earlier reminder for the same practice. Returns false when
 * notifications aren't allowed.
 */
export async function scheduleRehydrationReminder(
  practiceId: string,
  fluidTarget: string,
): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await cancelRehydrationReminder(practiceId);
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(practiceId),
    content: {
      title: 'Keep rehydrating',
      body: `Aim for about ${fluidTarget} since practice, with some sodium. Log your drinks in Mat Log to track it.`,
      data: { url: `/practice/${practiceId}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: REMIND_AFTER_SECONDS,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
  });
  return true;
}

export async function cancelRehydrationReminder(practiceId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderId(practiceId)).catch(() => {});
}

/** Opens the practice when a reminder is tapped. Returns an unsubscribe function. */
export function onReminderTapped(open: (url: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  });
  return () => subscription.remove();
}
