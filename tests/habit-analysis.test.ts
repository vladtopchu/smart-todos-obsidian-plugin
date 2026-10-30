import { describe, it, expect } from 'vitest';
import { analyzeHabit } from '../src/habit-analysis';
import type { Habit } from '../src/types';

const habit: Habit = { id: 'h', path: 'h.md', title: 'Read', days: [1, 2, 3, 4, 5], completions: ['2026-10-26', '2026-10-28'], created: '2026-10-27', archived: false, description: '' };
describe('read-only period habit analysis', () => {
  it('excludes dates before creation, rest days and future days', () => {
    expect(analyzeHabit(habit, 'week', '2026-10-30', '2026-10-30')).toEqual({ completed: 1, planned: 4, missed: 2, pending: 1, percent: 25 });
  });
  it('does not count the unfinished current day as a miss', () => {
    expect(analyzeHabit({ ...habit, created: '2026-10-30' }, 'month', '2026-10-01', '2026-10-30')).toMatchObject({ planned: 1, completed: 0, missed: 0, pending: 1 });
  });
  it('has no completion percentage for a future period', () => {
    expect(analyzeHabit(habit, 'year', '2027-01-01', '2026-10-30')).toEqual({ completed: 0, planned: 0, missed: 0, pending: 0, percent: null });
  });
});
