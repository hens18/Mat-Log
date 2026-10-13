// Browsers don't get rehydration reminders; these keep the same API as reminders.ts.

export function configureNotifications() {}

export async function scheduleRehydrationReminder(
  _practiceId: string,
  _fluidTarget: string,
): Promise<boolean> {
  return false;
}

export async function cancelRehydrationReminder(_practiceId: string): Promise<void> {}

export function onReminderTapped(_open: (url: string) => void): () => void {
  return () => {};
}
