import { toast } from 'sonner-native';

import { haptics } from './haptics';

/** Confirmation toast plus a success haptic, used after saves and deletes. */
export function notifySuccess(title: string, description?: string) {
  haptics.success();
  toast.success(title, { description });
}

export function notifyError(title: string, description?: string) {
  haptics.error();
  toast.error(title, { description });
}
