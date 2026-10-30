import { habitDue, periodBounds, shiftDay } from './dates';
import type { Habit, Scope } from './types';

export function analyzeHabit(habit: Habit, scope: Scope, selected: string, today: string): { completed: number; planned: number; missed: number; pending: number; percent: number | null } {
  const { start, end } = periodBounds(scope, selected);
  const last = end < today ? end : today;
  const completions = new Set(habit.completions);
  let completed = 0; let planned = 0; let missed = 0; let pending = 0;
  for (let date = start > habit.created ? start : habit.created; date <= last; date = shiftDay(date, 1)) {
    if (!habitDue(habit.days, date)) continue;
    planned++;
    if (completions.has(date)) completed++;
    else if (date < today) missed++;
    else pending++;
  }
  return { completed, planned, missed, pending, percent: planned ? Math.round(completed / planned * 100) : null };
}
