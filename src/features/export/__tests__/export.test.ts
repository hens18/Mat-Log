import type { Practice, WeighIn } from '@/types/models';

import { csvCell, practicesCsv, toCsv, weighInsCsv } from '../csv';
import { formatMatTime, rangeStartKey, seasonLabel, summarizeSeason } from '../season';

const NOW = new Date(2026, 9, 13, 12);

const practice = (
  date: string,
  minutes: number | null,
  pre: number | null,
  post: number | null,
): Practice => ({
  id: date,
  user_id: 'u',
  practice_date: date,
  duration_minutes: minutes,
  intensity: 3,
  pre_weight: pre,
  post_weight: post,
  weight_lost: pre != null && post != null ? Math.round((pre - post) * 10) / 10 : null,
  notes: null,
  fluid_during_ml: null,
  created_at: '',
  updated_at: '',
});

const weighIn = (iso: string, weight: number, note: string | null = null): WeighIn => ({
  id: iso,
  user_id: 'u',
  weight,
  kind: 'morning',
  note,
  recorded_at: iso,
  created_at: '',
  updated_at: '',
});

describe('csv', () => {
  it('quotes fields that need it and neutralizes formulas', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell(-1.5)).toBe('-1.5');
    expect(csvCell(null)).toBe('');
  });

  it('builds rows with CRLF line endings', () => {
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe('A,B\r\n1,x\r\n');
  });

  it('exports weigh-ins oldest first with the unit in the header', () => {
    const csv = weighInsCsv(
      [
        weighIn(new Date(2026, 9, 13, 7, 5).toISOString(), 151.2),
        weighIn(new Date(2026, 9, 12, 7, 0).toISOString(), 152, 'after travel, tired'),
      ],
      'lb',
    );
    expect(csv.split('\r\n')).toEqual([
      'Date,Weight (lb),Kind,Note',
      '2026-10-12 07:00,152,Morning,"after travel, tired"',
      '2026-10-13 07:05,151.2,Morning,',
      '',
    ]);
  });

  it('exports practices with weight lost', () => {
    const csv = practicesCsv([practice('2026-10-12', 90, 152.4, 149)], 'lb');
    expect(csv.split('\r\n')[1]).toBe('2026-10-12,90,3,152.4,149,3.4,,');
  });
});

describe('season summary', () => {
  it('runs seasons from August 1', () => {
    expect(rangeStartKey('season', NOW)).toBe('2026-08-01');
    expect(rangeStartKey('season', new Date(2027, 1, 10))).toBe('2026-08-01');
    expect(rangeStartKey('30d', NOW)).toBe('2026-09-14');
    expect(rangeStartKey('all', NOW)).toBeNull();
    expect(seasonLabel('season', NOW)).toBe('2026-27 season');
  });

  it('totals practices, mat time, weight, and the best week', () => {
    const summary = summarizeSeason(
      {
        practices: [
          practice('2026-07-20', 120, 160, 155), // last season
          practice('2026-10-05', 90, 153, 150),
          practice('2026-10-06', 120, 152.4, 149),
          practice('2026-10-12', 60, null, null),
        ],
        weighIns: [
          weighIn(new Date(2026, 9, 5, 7).toISOString(), 153),
          weighIn(new Date(2026, 9, 6, 7).toISOString(), 152.5),
          weighIn(new Date(2026, 9, 7, 7).toISOString(), 152),
          weighIn(new Date(2026, 9, 12, 7).toISOString(), 151.4),
        ],
        competitions: [],
      },
      'season',
      NOW,
    );
    expect(summary).toEqual({
      practices: 3,
      matMinutes: 270,
      averageLost: 3.2,
      biggestLost: { amount: 3.4, date: '2026-10-06' },
      weighIns: 4,
      bestStreak: 3,
      weightChange: { from: 153, to: 151.4, change: -1.6 },
      bestWeek: { start: '2026-10-05', minutes: 210, practices: 2 },
      competitions: 0,
    });
  });

  it('formats mat time', () => {
    expect(formatMatTime(45)).toBe('45 min');
    expect(formatMatTime(1110)).toBe('18.5 hrs');
  });
});

describe('reportHtml', () => {
  it('escapes user text', () => {
    const { escapeHtml } = jest.requireActual('../report');
    expect(escapeHtml('<b>"Tom & Jerry\'s"</b>')).toBe(
      '&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;',
    );
  });
});
