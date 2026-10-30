import { describe, it, expect } from 'vitest';
import manifest from '../manifest.json';
import pkg from '../package.json';
import { PLUGIN_ID, PLUGIN_NAME, matchesEntityType } from '../src/identity';
import { PlannerStore } from '../src/store';
import { DEFAULT_SETTINGS } from '../src/types';
import { legacyTasks } from '../src/legacy';
import { codec, MemoryStorage } from './helpers';

describe('Smart Todo identity and original Markdown compatibility', () => {
  it('uses its own install/update ID and stays installable on mobile', () => {
    expect(PLUGIN_ID).toBe('smart-todo-vlad');
    expect(PLUGIN_ID).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    expect(PLUGIN_ID).not.toContain('obsidian');
    expect(PLUGIN_ID).not.toMatch(/plugin$/);
    expect(PLUGIN_NAME).toBe('Smart Todo');
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.isDesktopOnly).toBe(false);
    expect(matchesEntityType('other-plugin-task', 'task')).toBe(false);
  });

  it('reads and completes an original task without duplicating its checkbox or losing history and text', async () => {
    const storage = new MemoryStorage();
    const store = new PlannerStore(storage, codec, { ...DEFAULT_SETTINGS }, () => '2026-10-30');
    const path = '_todotracking/tasks/original.md';
    const oldHistory = [{ type: 'moved', date: '2026-10-29', from: '2026-10-28' }];
    storage.files.set(path, `---\n${codec.stringify({ type: 'dayline-task', id: 'original', title: 'Old title', status: 'open', scheduled: '2026-10-29', history: oldHistory, custom: 'keep', labels: [{ name: 'Работа', color: 'blue' }] })}\n---\n- [ ] Manual title <!-- dayline:task -->\n\n[[Link]]\n- [ ] Subtask\n`);
    expect((await store.snapshot()).tasks[0]).toMatchObject({ title: 'Manual title', initialScheduled: '2026-10-28', history: oldHistory });
    await store.setTaskStatus(path, 'done');
    const raw = await storage.read(path);
    expect(raw).toContain('- [x] Manual title <!-- smart-todo:task -->');
    expect(raw).not.toContain('<!-- dayline:task -->');
    expect(raw).toContain('[[Link]]\n- [ ] Subtask');
    expect(raw).toContain('"custom": "keep"');
    const task = (await store.snapshot()).tasks[0]!;
    expect(task).toMatchObject({ status: 'done', completed: '2026-10-30', labels: [{ name: 'Работа', color: 'blue' }] });
    expect(task.history).toHaveLength(2);
    expect(task.history[0]).toEqual(oldHistory[0]);
    await store.deleteTask(path);
    expect(storage.trashed.get(path)).toBe(raw);
  });

  it('recognizes and can delete original goals and habits while leaving unrelated notes alone', async () => {
    const storage = new MemoryStorage();
    const store = new PlannerStore(storage, codec, { ...DEFAULT_SETTINGS });
    const goal = '_todotracking/goals/old-goal.md';
    const habit = '_todotracking/habits/old-habit.md';
    storage.files.set(goal, `---\n${codec.stringify({ type: 'dayline-goal', id: 'old-goal', title: 'Goal', status: 'active' })}\n---\nGoal text`);
    storage.files.set(habit, `---\n${codec.stringify({ type: 'dayline-habit', id: 'old-habit', title: 'Habit', days: [5], completions: ['2026-10-30'], created: '2026-10-01' })}\n---\nHabit text`);
    const unrelated = '_todotracking/goals/unrelated.md';
    storage.files.set(unrelated, '---\n{"id":"unrelated","type":"other-plugin-goal"}\n---\nMy text');
    const before = await store.snapshot();
    expect(before.goals).toHaveLength(1); expect(before.habits[0]!.completions).toEqual(['2026-10-30']);
    await expect(store.deleteGoal(unrelated)).rejects.toThrow();
    await store.deleteGoal(goal); await store.deleteHabit(habit);
    expect(storage.trashed.size).toBe(2); expect(storage.exists(unrelated)).toBe(true);
  });

  it('does not import its own task checkbox under either marker', () => {
    expect(legacyTasks('- [ ] Old <!-- dayline:task -->\n- [ ] New <!-- smart-todo:task -->\n- [ ] Regular')).toEqual([{ title: 'Regular', line: 3 }]);
  });
});
