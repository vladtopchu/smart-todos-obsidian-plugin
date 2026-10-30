import type { Recurrence, Scope } from './types';

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function nextNoon(now: Date): Date {
  const next = new Date(now); next.setHours(12, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}
export function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Некорректная дата: ${value}`);
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d, 12);
  if (dateKey(date) !== value) throw new Error(`Некорректная дата: ${value}`);
  return date;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { parseDate(value); return true; } catch { return false; }
}
export function shiftDay(value: string, offset: number): string {
  const date = parseDate(value); date.setDate(date.getDate() + offset); return dateKey(date);
}
export function weekStart(value: string): string {
  return shiftDay(value, -((parseDate(value).getDay() + 6) % 7));
}
export function weekDays(value: string): string[] { return Array.from({ length: 7 }, (_, i) => shiftDay(weekStart(value), i)); }
export function isoWeek(value: string): string {
  const local = parseDate(value);
  const date = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const n = Math.ceil((((date.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7);
  return `${year}-W${String(n).padStart(2, '0')}`;
}
export function periodKey(scope: Scope, value: string): string {
  return scope === 'day' ? value : scope === 'week' ? isoWeek(value) : scope === 'month' ? value.slice(0, 7) : value.slice(0, 4);
}
export function inPeriod(date: string, scope: Scope, selected: string): boolean { return periodKey(scope, date) === periodKey(scope, selected); }
export function periodBounds(scope: Scope, selected: string): { start: string; end: string } {
  if (scope === 'day') return { start: selected, end: selected };
  if (scope === 'week') return { start: weekStart(selected), end: shiftDay(weekStart(selected), 6) };
  const start = scope === 'month' ? selected.slice(0, 7) + '-01' : selected.slice(0, 4) + '-01-01';
  return { start, end: shiftDay(stepPeriod(start, scope, 1), -1) };
}
export function stepPeriod(value: string, scope: Scope, offset: number): string {
  if (scope === 'day' || scope === 'week') return shiftDay(value, offset * (scope === 'week' ? 7 : 1));
  const date = parseDate(value);
  date.setDate(1);
  if (scope === 'month') date.setMonth(date.getMonth() + offset);
  else date.setFullYear(date.getFullYear() + offset);
  return dateKey(date);
}
export function nextOccurrence(value: string, recurrence: Recurrence): string {
  if (recurrence === 'monthly') {
    const date = parseDate(value); const day = date.getDate();
    date.setDate(1); date.setMonth(date.getMonth() + 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last)); return dateKey(date);
  }
  let next = shiftDay(value, recurrence === 'weekly' ? 7 : 1);
  while (recurrence === 'weekdays' && [0, 6].includes(parseDate(next).getDay())) next = shiftDay(next, 1);
  return next;
}
export function displayDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }): string {
  return parseDate(value).toLocaleDateString('ru-RU', options);
}
export function habitDue(days: number[], value: string): boolean { return days.includes(parseDate(value).getDay()); }
export function habitStreak(days: number[], completions: string[], today: string, created: string): number {
  if (!days.length) return 0;
  const set = new Set(completions); let count = 0; let cursor = today;
  if (!set.has(cursor)) cursor = shiftDay(cursor, -1);
  // Bound by the actual record, not an arbitrary lookback window.
  const earliest = completions.reduce((min, date) => date < min ? date : min, created);
  while (cursor >= earliest) {
    if (habitDue(days, cursor)) { if (!set.has(cursor)) break; count++; }
    cursor = shiftDay(cursor, -1);
  }
  return count;
}
