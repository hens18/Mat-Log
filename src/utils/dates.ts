// Postgres `date` columns (like practices.practice_date) come back as
// 'YYYY-MM-DD' strings with no time zone. These helpers convert between that
// format and local-time Date objects without shifting the day.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}
