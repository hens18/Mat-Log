export type AxisScale = {
  /** Value at the bottom of the y-axis. */
  min: number;
  /** Distance between gridlines. */
  step: number;
  sections: number;
};

const NICE_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

/**
 * A y-axis that hugs the data instead of starting at zero, so a 2 lb change
 * at 150 lb is actually visible. Steps snap to friendly values, and there is
 * always a little headroom above and below the data.
 */
export function axisScale(values: readonly number[], sections = 4): AxisScale {
  if (values.length === 0) return { min: 0, step: 1, sections };

  const lo = Math.min(...values);
  const hi = Math.max(...values);

  for (const step of NICE_STEPS) {
    const pad = step / 4;
    const min = Math.floor((lo - pad) / step) * step;
    if (min + step * sections >= hi + pad) {
      return { min: Math.max(0, min), step, sections };
    }
  }

  const step = Math.ceil((hi - lo) / sections);
  return { min: Math.max(0, Math.floor(lo)), step, sections };
}
