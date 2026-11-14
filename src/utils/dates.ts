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

/** `base` moved to the calendar day of `day`, keeping its time of day. */
export function withDay(base: Date, day: Date): Date {
  const next = new Date(base);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next;
}

/** `base` moved to the time of day of `time`, keeping its calendar day. */
export function withTime(base: Date, time: Date): Date {
  const next = new Date(base);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

/** 'HH:MM' in 24-hour time, the format of an HTML time input. */
export function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
