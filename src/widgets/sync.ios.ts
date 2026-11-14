// Pushes the countdown timeline to the iOS home screen widget. Expo Go
// doesn't include the widgets native module, so check for it before loading
// the widget, which would otherwise crash on import.

import { requireOptionalNativeModule } from 'expo';

import type { CountdownWidgetProps } from './timeline';

const available = requireOptionalNativeModule('ExpoWidgets') != null;

export function syncCountdownWidget(entries: { date: Date; props: CountdownWidgetProps }[]): void {
  if (!available) return;
  try {
    // Loaded lazily so the import above never runs where the module is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('./CountdownWidget')
      .default as typeof import('./CountdownWidget').default;
    widget.updateTimeline(entries);
  } catch {
    // A widget refresh failing should never break the app.
  }
}
