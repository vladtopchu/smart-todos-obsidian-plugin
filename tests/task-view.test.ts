import { describe, expect, it } from 'vitest';
import { carriedTask, tasksForPeriod } from '../src/task-view';
import type { Scope, Task } from '../src/types';

const task = (patch: Partial<Task> = {}): Task => ({ id: 'one', path: 'one.md', title: 'Task', status: 'open', scheduled: '2026-10-20', initialScheduled: '2026-10-20', scope: 'day', priority: 'normal', recurrence: 'none', goal: '', labels: [], due: '', created: '2026-10-19', completed: '', history: [], description: '', ...patch });

describe('task display without automatic writes', () => {
  it('includes earlier unfinished daily tasks only in today, preserving all task data', () => {
    const tasks = [task(), task({ id: 'week', scope: 'week' }), task({ id: 'cancelled', status: 'cancelled' }), task({ id: 'future', scheduled: '2026-11-02' })];
    const original = JSON.stringify(tasks);
    expect(tasksForPeriod(tasks, 'day', '2026-11-01', '2026-11-01').map(t => t.id)).toEqual(['one']);
    for (const selected of ['2026-10-31', '2026-11-03']) expect(tasksForPeriod(tasks, 'day', selected, '2026-11-01')).toEqual([]);
    expect(JSON.stringify(tasks)).toBe(original);
  });
  it('shows actual completions as well as the original plan, without duplicate rows', () => {
    const done = task({ status: 'done', completed: '2026-11-01' });
    expect(tasksForPeriod([done], 'day', '2026-11-01', '2026-11-01')).toEqual([done]);
    expect(tasksForPeriod([done], 'day', '2026-10-20', '2026-11-01')).toEqual([done]);
    expect(tasksForPeriod([done], 'day', '2026-11-02', '2026-11-02')).toEqual([]);
    expect(tasksForPeriod([done], 'year', '2026-11-01', '2026-11-01')).toHaveLength(1);
  });
  it.each<Scope>(['week', 'month', 'year'])('keeps older unfinished work in the current %s, without leaking into other periods', scope => {
    const old = task({ scheduled: '2025-12-20' });
    expect(carriedTask(old, scope, '2026-11-01', '2026-11-01')).toBe(true);
    expect(tasksForPeriod([old], scope, '2026-11-01', '2026-11-01')).toEqual([old]);
    expect(tasksForPeriod([old], scope, '2027-02-01', '2026-11-01')).toEqual([]);
  });
  it('respects ISO week boundaries and keeps larger horizons out of the day', () => {
    const weekly = task({ scope: 'week', scheduled: '2026-12-21' });
    expect(carriedTask(weekly, 'week', '2027-01-01', '2026-12-31')).toBe(true);
    expect(tasksForPeriod([weekly], 'day', '2026-12-31', '2026-12-31')).toEqual([]);
  });
});
