import type { WeightUnit } from '@/types/models';

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${value.toFixed(1)} ${unit}`;
}

/** Signed change such as "+1.2 lb", "-0.4 lb", or "0.0 lb". */
export function formatChange(value: number, unit: WeightUnit): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(1)} ${unit}`;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Turns Supabase/auth errors into something worth showing a user. */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message);
    if (message) return message;
  }
  return 'Something went wrong. Please try again.';
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
