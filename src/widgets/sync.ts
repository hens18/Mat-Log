// Home screen widgets are iOS only (expo-widgets); see sync.ios.ts.
import type { CountdownWidgetProps } from './timeline';

export function syncCountdownWidget(
  _entries: { date: Date; props: CountdownWidgetProps }[],
): void {}
