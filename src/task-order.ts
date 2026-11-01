import type { Task } from './types';

export function compareTaskCreation(a: Task, b: Task): number {
  if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  // Existing tasks have no precise timestamp. Keep their stable order ahead of
  // newly added tasks instead of inventing creation times or rewriting notes.
  if (a.createdAt || b.createdAt) return a.createdAt ? 1 : -1;
  return a.created.localeCompare(b.created) || a.id.localeCompare(b.id);
}
