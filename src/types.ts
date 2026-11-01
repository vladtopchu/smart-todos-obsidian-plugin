export type Scope = 'day' | 'week' | 'month' | 'year';
export type Screen = Scope | 'goals' | 'habits' | 'stats';
export type LabelColor = 'gray' | 'red' | 'orange' | 'green' | 'blue' | 'purple';
export interface TaskLabel { name: string; color: LabelColor }
export type Priority = 'normal' | 'high' | 'low';
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export interface Task {
  id: string;
  path: string;
  title: string;
  status: 'open' | 'done' | 'cancelled';
  scheduled: string;
  initialScheduled: string;
  scope: Scope;
  priority: Priority;
  recurrence: Recurrence;
  goal: string;
  labels: TaskLabel[];
  due: string;
  created: string;
  createdAt?: string;
  completed: string;
  history: { type: 'moved' | 'completed' | 'reopened' | 'cancelled'; date: string; from?: string; to?: string; at?: string; effectiveAt?: string; automatic?: boolean }[];
  description: string;
  archived?: boolean;
}
export interface Goal {
  id: string;
  path: string;
  title: string;
  target: string;
  status: 'active' | 'done' | 'archived';
  description: string;
}
export interface Habit {
  id: string;
  path: string;
  title: string;
  days: number[];
  completions: string[];
  created: string;
  archived: boolean;
  description: string;
}
export interface Settings {
  root: string;
  showCompleted: boolean;
  tasksOnly: boolean;
  labelPresets: TaskLabel[];
}
export const DEFAULT_SETTINGS: Settings = { root: '_todotracking', showCompleted: true, tasksOnly: false, labelPresets: [] };
export interface Snapshot { tasks: Task[]; goals: Goal[]; habits: Habit[]; warnings: string[] }
export interface Storage {
  list(): string[] | Promise<string[]>;
  read(path: string): Promise<string>;
  create(path: string, content: string): Promise<void>;
  process(path: string, update: (content: string) => string): Promise<void>;
  exists(path: string): boolean | Promise<boolean>;
  move(from: string, to: string): Promise<void>;
  trash(path: string): Promise<void>;
}
export interface Codec {
  parse(text: string): Record<string, unknown>;
  stringify(value: Record<string, unknown>): string;
}
