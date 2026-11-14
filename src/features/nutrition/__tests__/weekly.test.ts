import { nutrientTargets } from '../targets';
import { buildWeeklyReport, shiftDateKey, weekStartKey, type WeeklyEntry } from '../weekly';

const targets = nutrientTargets(
  { sex: 'male', birthYear: 2009, calorieGoal: null },
  new Date(2026, 9, 13),
);
const entry = (
  logged_on: string,
  name: string,
  micros: object | null,
  protein_g: number | null = null,
): WeeklyEntry => ({
  logged_on,
  name,
  micros: micros as WeeklyEntry['micros'],
  protein_g,
});

describe('week keys', () => {
  it('covers 7 days ending on the given day', () => {
    expect(weekStartKey('2026-10-13')).toBe('2026-10-07');
    expect(shiftDateKey('2026-10-01', -7)).toBe('2026-09-24');
  });
});

describe('buildWeeklyReport', () => {
  const entries = [
    entry(
      '2026-10-12',
      'Greek yogurt',
      { calcium: 400, potassium: 500, sodium: 100, iron: 0.2 },
      30,
    ),
    entry('2026-10-12', 'Pizza', { calcium: 300, potassium: 400, sodium: 2400, iron: 3 }, 25),
    entry(
      '2026-10-13',
      'Greek yogurt',
      { calcium: 400, potassium: 500, sodium: 100, iron: 0.2 },
      30,
    ),
    entry('2026-10-13', 'Team pasta', null, 40),
    entry('2026-10-01', 'Old food', { calcium: 5000 }),
  ];
  const report = buildWeeklyReport(entries, targets, '2026-10-13');

  it('averages over days with nutrient data and ignores other weeks', () => {
    expect(report.daysLogged).toBe(2);
    expect(report.daysWithData).toBe(2);
    expect(report.entriesWithData).toBe(3);
    expect(report.totalEntries).toBe(4);
    const calcium = report.nutrients.find((n) => n.def.key === 'calcium')!;
    expect(calcium.average).toBe(550);
    expect(calcium.percent).toBe(42);
    expect(calcium.status).toBe('low');
  });

  it('lists low nutrients lowest first and limits that run over', () => {
    expect(report.low.map((n) => n.def.key)).toEqual(['iron', 'potassium', 'calcium']);
    expect(report.over.map((n) => n.def.key)).toEqual([]);
    const sodium = report.nutrients.find((n) => n.def.key === 'sodium')!;
    expect(sodium.average).toBe(1300);
    expect(sodium.status).toBe('onTrack');
  });

  it('ranks the foods that supplied the most', () => {
    const calcium = report.nutrients.find((n) => n.def.key === 'calcium')!;
    expect(calcium.topSources).toEqual([
      { name: 'Greek yogurt', amount: 800 },
      { name: 'Pizza', amount: 300 },
    ]);
  });

  it('flags limits over 100%', () => {
    const salty = buildWeeklyReport(
      [entry('2026-10-13', 'Ramen', { sodium: 3000 })],
      targets,
      '2026-10-13',
    );
    expect(salty.over.map((n) => n.def.key)).toEqual(['sodium']);
  });

  it('does not rate nutrients that few foods reported', () => {
    const sparse = buildWeeklyReport(
      [
        entry('2026-10-13', 'A', { calcium: 100, vitaminD: 1 }),
        entry('2026-10-13', 'B', { calcium: 100 }),
        entry('2026-10-13', 'C', { calcium: 100 }),
      ],
      targets,
      '2026-10-13',
    );
    const vitaminD = sparse.nutrients.find((n) => n.def.key === 'vitaminD')!;
    expect(vitaminD.sparse).toBe(true);
    expect(sparse.low.map((n) => n.def.key)).toEqual(['calcium']);
    expect(sparse.nutrients.find((n) => n.def.key === 'zinc')!.status).toBe('noData');
  });

  it('compares average protein with a weight-based target', () => {
    const withProtein = buildWeeklyReport(entries, targets, '2026-10-13', {
      grams: 109,
      low: 95,
      high: 136,
      weightKg: 68,
    });
    // (30 + 25) + (30 + 40) over 2 days
    expect(withProtein.protein).toMatchObject({ average: 63, percent: 58 });
  });

  it('handles an empty week', () => {
    const empty = buildWeeklyReport([], targets, '2026-10-13');
    expect(empty.entriesWithData).toBe(0);
    expect(empty.low).toEqual([]);
    expect(empty.nutrients.every((n) => n.status === 'noData')).toBe(true);
  });
});
