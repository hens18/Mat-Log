export const INTENSITY_LABELS: Record<number, string> = {
  1: 'Light',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'All out',
};

export const ENERGY_LABELS: Record<number, string> = {
  1: 'Drained',
  2: 'Low',
  3: 'OK',
  4: 'Good',
  5: 'Great',
};

export const SCALE_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));
