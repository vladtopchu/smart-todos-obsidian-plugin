import { describe, it, expect } from 'vitest';
import { dateKey, habitStreak, isoWeek, nextOccurrence, parseDate, periodBounds, shiftDay, weekDays } from '../src/dates';
describe('local dates', () => {
  it('calculates period bounds across year and leap-month boundaries', () => {
    expect(periodBounds('week', '2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(periodBounds('month', '2024-02-15')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });
  it('uses local calendar dates and crosses leap day/month/year boundaries', () => {
    expect(dateKey(parseDate('2024-02-29'))).toBe('2024-02-29'); expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01'); expect(() => parseDate('2026-02-29')).toThrow();
  });
  it('uses Monday and ISO week years', () => {
    expect(weekDays('2027-01-01')[0]).toBe('2026-12-28'); expect(isoWeek('2027-01-01')).toBe('2026-W53'); expect(isoWeek('2027-01-04')).toBe('2027-W01');
  });
  it('skips weekends and clamps monthly dates without overflow', () => {
    expect(nextOccurrence('2026-10-30', 'weekdays')).toBe('2026-11-02'); expect(nextOccurrence('2027-01-31', 'monthly')).toBe('2027-02-28');
  });
  it.each([
    ['2026-12-30', 'daily', 3, '2027-01-02'],
    ['2026-12-25', 'weekly', 2, '2027-01-08'],
    ['2027-01-31', 'monthly', 2, '2027-03-31'],
    ['2027-01-31', 'monthly', 3, '2027-04-30'],
    ['2023-12-31', 'monthly', 2, '2024-02-29'],
    ['2024-02-29', 'yearly', 1, '2025-02-28'],
    ['2024-02-29', 'yearly', 4, '2028-02-29'],
    ['2026-11-04', 'yearly', 2, '2028-11-04'],
  ] as const)('advances %s by %s × %i to %s', (date, unit, interval, expected) => {
    expect(nextOccurrence(date, unit, interval)).toBe(expected);
  });
  it('rejects invalid intervals and dates outside the supported range', () => {
    for (const interval of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => nextOccurrence('2026-11-04', 'daily', interval)).toThrow('Интервал');
    expect(() => nextOccurrence('2026-11-04', 'yearly', 10000)).toThrow('диапазон');
  });
  it('counts streaks by planned days and allows today to remain unfinished', () => {
    expect(habitStreak([1, 3, 5], ['2026-10-26', '2026-10-28'], '2026-10-30', '2026-10-01')).toBe(2);
    expect(habitStreak([1, 3, 5], ['2026-10-26', '2026-10-30'], '2026-10-30', '2026-10-01')).toBe(1);
    expect(habitStreak([], [], '2026-10-30', '2026-10-01')).toBe(0);
  });
});
