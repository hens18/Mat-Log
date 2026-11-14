// The PDF report for a coach or athletic trainer, as print-ready HTML.

import { formatMatTime, type SeasonSummary } from './season';
import type { Practice, WeighIn, WeightUnit } from '@/types/models';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const KIND: Record<WeighIn['kind'], string> = {
  morning: 'Morning',
  pre_practice: 'Pre-practice',
  post_practice: 'Post-practice',
  night: 'Night',
};

export function reportHtml(input: {
  name: string | null;
  email: string | null;
  rangeLabel: string;
  unit: WeightUnit;
  weightClass: number | null;
  summary: SeasonSummary;
  weighIns: readonly WeighIn[];
  practices: readonly Practice[];
  generatedAt?: Date;
}): string {
  const { unit, summary } = input;
  const w = (n: number | null | undefined) => (n == null ? '' : `${n} ${unit}`);
  const stat = (label: string, value: string) =>
    `<div class="stat"><div class="value">${escapeHtml(value)}</div><div class="label">${label}</div></div>`;

  const weighRows = [...input.weighIns]
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
    .map(
      (x) =>
        `<tr><td>${new Date(x.recorded_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td>${w(x.weight)}</td><td>${KIND[x.kind]}</td><td>${escapeHtml(x.note ?? '')}</td></tr>`,
    )
    .join('');
  const practiceRows = [...input.practices]
    .sort((a, b) => b.practice_date.localeCompare(a.practice_date))
    .map(
      (p) =>
        `<tr><td>${p.practice_date}</td><td>${p.duration_minutes ?? ''}${p.duration_minutes ? ' min' : ''}</td><td>${p.intensity ?? ''}</td><td>${w(p.pre_weight)}</td><td>${w(p.post_weight)}</td><td>${w(p.weight_lost)}</td></tr>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>Mat Log report</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 32px; }
  h1 { margin: 0; font-size: 26px; } h2 { font-size: 16px; margin: 28px 0 8px; }
  .muted { color: #666; font-size: 12px; }
  .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; min-width: 120px; }
  .value { font-size: 18px; font-weight: 700; } .label { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #eee; }
  th { background: #f6f6f6; }
</style></head><body>
<h1>Mat Log report</h1>
<div class="muted">${escapeHtml([input.name, input.email].filter(Boolean).join(' · '))}${input.weightClass ? ` · Weight class ${w(input.weightClass)}` : ''}</div>
<div class="muted">${escapeHtml(input.rangeLabel)} · Generated ${(input.generatedAt ?? new Date()).toLocaleDateString()}</div>
<div class="stats">
  ${stat('Practices', String(summary.practices))}
  ${stat('Mat time', formatMatTime(summary.matMinutes))}
  ${stat('Avg lost per practice', summary.averageLost != null ? w(summary.averageLost) : 'n/a')}
  ${stat('Weigh-ins', String(summary.weighIns))}
  ${stat('Weight change', summary.weightChange ? `${summary.weightChange.change > 0 ? '+' : ''}${w(summary.weightChange.change)}` : 'n/a')}
  ${stat('Best streak', `${summary.bestStreak} days`)}
</div>
<h2>Weigh-ins</h2>
<table><tr><th>When</th><th>Weight</th><th>Kind</th><th>Note</th></tr>${weighRows || '<tr><td colspan="4">None</td></tr>'}</table>
<h2>Practices</h2>
<table><tr><th>Date</th><th>Duration</th><th>Intensity</th><th>Pre</th><th>Post</th><th>Lost</th></tr>${practiceRows || '<tr><td colspan="6">None</td></tr>'}</table>
</body></html>`;
}
