import { inPeriod, periodBounds } from './dates';
import type { Scope, Task } from './types';

const ranks: Record<Scope, number> = { day: 0, week: 1, month: 2, year: 3 };

export function carriedTask(task: Task, scope: Scope, selected: string, today: string): boolean {
  return task.status === 'open' && ranks[task.scope] <= ranks[scope]
    && inPeriod(today, scope, selected) && task.scheduled < periodBounds(scope, selected).start;
}

// Dates stay in storage; only the view includes unfinished work from earlier periods.
export function tasksForPeriod(tasks: Task[], scope: Scope, selected: string, today: string): Task[] {
  return tasks.filter(task => task.status !== 'cancelled' && ranks[task.scope] <= ranks[scope] && (
    inPeriod(task.scheduled, scope, selected) || carriedTask(task, scope, selected, today)
    || (task.status === 'done' && !!task.completed && inPeriod(task.completed, scope, selected))
  ));
}
