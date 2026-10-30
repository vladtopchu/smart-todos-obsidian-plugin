import { describe, it, expect } from 'vitest';
import { dateKey, habitStreak, isoWeek, nextNoon, nextOccurrence, parseDate, periodBounds, shiftDay, weekDays } from '../src/dates';
describe('local dates', () => {
  it('schedules the next local noon, including midnight and year boundaries', () => {
    const before = new Date(2026, 9, 30, 11, 59, 59); expect(nextNoon(before).getTime() - before.getTime()).toBe(1000);
    const noon = new Date(2026, 11, 31, 12); expect(dateKey(nextNoon(noon))).toBe('2027-01-01'); expect(nextNoon(noon).getHours()).toBe(12);
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
  it('counts streaks by planned days and allows today to remain unfinished', () => {
    expect(habitStreak([1, 3, 5], ['2026-10-26', '2026-10-28'], '2026-10-30', '2026-10-01')).toBe(2);
    expect(habitStreak([1, 3, 5], ['2026-10-26', '2026-10-30'], '2026-10-30', '2026-10-01')).toBe(1);
    expect(habitStreak([], [], '2026-10-30', '2026-10-01')).toBe(0);
  });
});
