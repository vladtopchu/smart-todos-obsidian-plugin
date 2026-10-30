import { describe, it, expect } from 'vitest';
import { PlannerStore, normalizeRoot } from '../src/store';
import { DEFAULT_SETTINGS } from '../src/types';
import { codec, MemoryStorage } from './helpers';
import { importLegacy, legacyTasks } from '../src/legacy';
import { parseDate } from '../src/dates';

function setup(today = '2026-10-30') { const storage = new MemoryStorage(); let date = today; let hour = 12; let minute = 0; const store = new PlannerStore(storage, codec, { ...DEFAULT_SETTINGS }, () => date, () => { const now = parseDate(date); now.setHours(hour, minute, 0, 0); return now; }); return { store, storage, setDate: (value: string) => { date = value; }, setTime: (h: number, m = 0) => { hour = h; minute = m; } }; }
describe('atomic task lifecycle', () => {
  it('waits until noon, preserves yesterday before cutoff, and records source, target and execution time once', async () => {
    const { store, setTime } = setup(); const path = await store.createTask({ title: 'Yesterday', scheduled: '2026-10-29' });
    setTime(0); expect(await store.rollover()).toBe(0);
    setTime(11, 59); expect(await store.rollover()).toBe(0); expect((await store.snapshot()).tasks[0]!.scheduled).toBe('2026-10-29');
    setTime(12); expect(await store.rollover()).toBe(1); expect(await store.rollover()).toBe(0);
    expect((await store.snapshot()).tasks[0]).toMatchObject({ path, initialScheduled: '2026-10-29', scheduled: '2026-10-30', history: [{ type: 'moved', from: '2026-10-29', to: '2026-10-30', automatic: true, at: expect.any(String), effectiveAt: expect.any(String) }] });
    const h = (await store.snapshot()).tasks[0]!.history[0]!; expect(new Date(h.effectiveAt!).getHours()).toBe(12); expect(h.at).toBe(h.effectiveAt);
  });
  it('catches up only elapsed noon deadlines without inventing offline history', async () => {
    const { store, setTime } = setup(); await store.createTask({ title: 'Old', scheduled: '2026-10-20' });
    setTime(9); expect(await store.rollover()).toBe(1);
    let task = (await store.snapshot()).tasks[0]!; expect(task.scheduled).toBe('2026-10-29'); expect(task.history).toHaveLength(1);
    expect(task.history[0]).toMatchObject({ date: '2026-10-30', from: '2026-10-20', to: '2026-10-29' }); expect(new Date(task.history[0]!.at!).getHours()).toBe(9);
    setTime(12); expect(await store.rollover()).toBe(1); task = (await store.snapshot()).tasks[0]!;
    expect(task.initialScheduled).toBe('2026-10-20'); expect(task.history).toHaveLength(2); expect(task.scheduled).toBe('2026-10-30');
  });
  it('preserves colored labels through rollover and completion independently of goals', async () => {
    const { store } = setup();
    const path = await store.createTask({ title: 'Labeled', scheduled: '2026-10-20', goal: 'goal-1', labels: [{ name: 'Работа', color: 'blue' }, { name: 'Срочно', color: 'red' }] });
    await store.rollover(); await store.setTaskStatus(path, 'done');
    expect((await store.snapshot()).tasks[0]).toMatchObject({ goal: 'goal-1', labels: [{ name: 'Работа', color: 'blue' }, { name: 'Срочно', color: 'red' }] });
    await store.updateTask(path, { labels: [] }); expect((await store.snapshot()).tasks[0]!.labels).toEqual([]);
  });
  it('keeps cancellation as a recorded status and deletion as recoverable removal', async () => {
    const { store, storage } = setup();
    const cancelled = await store.createTask({ title: 'Отмена', scheduled: '2026-10-30' });
    const deleted = await store.createTask({ title: 'Случайная задача', scheduled: '2026-10-30', description: 'Текст для восстановления' });
    const original = await storage.read(deleted);
    await store.setTaskStatus(cancelled, 'cancelled'); await store.deleteTask(deleted);
    expect(storage.exists(cancelled)).toBe(true); expect(storage.exists(deleted)).toBe(false);
    expect(storage.trashed.get(deleted)).toBe(original);
    expect((await store.snapshot()).tasks).toMatchObject([{ path: cancelled, status: 'cancelled', history: [{ type: 'cancelled', date: '2026-10-30' }] }]);
    await store.setTaskStatus(cancelled, 'open'); expect((await store.snapshot()).tasks[0]!.status).toBe('open');
  });
  it('refuses to trash notes, goals, and files outside the task folder', async () => {
    const { store, storage } = setup();
    const note = await store.ensureNote('day', '2026-10-30');
    storage.files.set('_todotracking/tasks/other.md', '---\n{"id":"mine","type":"my-note"}\n---\nMy note');
    for (const path of [note, '_todotracking/tasks/../days/2026-10-30.md', '_todotracking/tasks/other.md']) await expect(store.deleteTask(path)).rejects.toThrow();
    expect(storage.trashed.size).toBe(0); expect(storage.exists(note)).toBe(true);
  });
  it('rolls over all missed days once without duplicating tasks or touching other horizons', async () => {
    const { store, storage } = setup();
    const path = await store.createTask({ title: 'Очень важное', scheduled: '2026-10-20', description: 'Мой текст\n\n[[Ссылка]]' });
    await store.createTask({ title: 'Будущее', scheduled: '2026-11-01' });
    await store.createTask({ title: 'Неделя', scheduled: '2026-10-19', scope: 'week' });
    const done = await store.createTask({ title: 'Завершено', scheduled: '2026-10-15' }); await store.setTaskStatus(done, 'done');
    const cancelled = await store.createTask({ title: 'Отменено', scheduled: '2026-10-15' }); await store.setTaskStatus(cancelled, 'cancelled');
    expect(await store.rollover()).toBe(1); expect(await store.rollover()).toBe(0);
    expect(storage.files.size).toBe(5);
    const task = (await store.snapshot()).tasks.find(t => t.path === path)!;
    expect(task).toMatchObject({ scheduled: '2026-10-30', description: 'Мой текст\n\n[[Ссылка]]', history: [{ type: 'moved', from: '2026-10-20', date: '2026-10-30' }] });
  });
  it('rechecks current state after concurrent rollover scans', async () => {
    const { store } = setup(); await store.createTask({ title: 'One', scheduled: '2026-10-01' });
    const counts = await Promise.all([store.rollover(), store.rollover(), store.rollover()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1); expect((await store.snapshot()).tasks[0]!.history).toHaveLength(1);
  });
  it('preserves unfamiliar frontmatter and freeform markdown on completion', async () => {
    const { store, storage } = setup(); const path = await store.createTask({ title: 'A', scheduled: '2026-10-30', description: '## Подзадачи\n- [ ] Мой чекбокс\n\n`code` и [[линк]]' });
    const raw = await storage.read(path); storage.files.set(path, raw.replace('"history": []', '"history": [], "custom": {"mine": true}'));
    await store.setTaskStatus(path, 'done');
    expect(await storage.read(path)).toContain('"mine": true'); expect(await storage.read(path)).toContain('- [ ] Мой чекбокс');
    expect((await store.snapshot()).tasks[0]).toMatchObject({ status: 'done', completed: '2026-10-30' });
    await store.setTaskStatus(path, 'open'); expect((await store.snapshot()).tasks[0]).toMatchObject({ status: 'open', completed: '' });
  });
  it('respects manual edits to the ordinary task checkbox and title', async () => {
    const { store, storage } = setup(); const path = await store.createTask({ title: 'Old title', scheduled: '2026-10-30' });
    storage.files.set(path, (await storage.read(path)).replace('- [ ] Old title <!--', '- [x] New title <!--'));
    expect((await store.snapshot()).tasks[0]).toMatchObject({ status: 'done', title: 'New title' });
  });
  it('advances recurrence atomically and ignores an accidental double click', async () => {
    const { store, storage, setDate } = setup(); const path = await store.createTask({ title: 'Daily', scheduled: '2026-10-30', recurrence: 'daily' });
    await Promise.all([store.setTaskStatus(path, 'done'), store.setTaskStatus(path, 'done')]);
    expect(storage.files.size).toBe(1); expect((await store.snapshot()).tasks[0]).toMatchObject({ status: 'open', scheduled: '2026-10-31', history: [{ type: 'completed', date: '2026-10-30', from: '2026-10-30' }] });
    setDate('2026-10-31'); await store.setTaskStatus(path, 'done'); expect((await store.snapshot()).tasks[0]!.scheduled).toBe('2026-11-01');
  });
  it('does not move weekday routines into a weekend', async () => {
    const { store, setDate } = setup('2026-10-31'); await store.createTask({ title: 'Work', scheduled: '2026-10-30', recurrence: 'weekdays' });
    expect(await store.rollover()).toBe(0); setDate('2026-11-02'); expect(await store.rollover()).toBe(1);
  });
  it('keeps overdue tasks unchanged when rollover is disabled', async () => {
    const { store } = setup(); await store.createTask({ title: 'Old', scheduled: '2026-10-01' }); store.settings.autoRollover = false;
    expect(await store.rollover()).toBe(0); expect((await store.snapshot()).tasks[0]!.scheduled).toBe('2026-10-01');
  });
  it('reports malformed files without hiding valid tasks', async () => {
    const { store, storage } = setup(); await store.createTask({ title: 'Valid', scheduled: '2026-10-30' });
    storage.files.set('_todotracking/tasks/broken.md', 'Invalid');
    const snapshot = await store.snapshot(); expect(snapshot.tasks).toHaveLength(1); expect(snapshot.warnings).toHaveLength(1);
    await expect(store.createTask({ title: 'Bad date', scheduled: '2026-02-31' })).rejects.toThrow();
  });
});
describe('habit records', () => {
  it('trashes goals and habits recoverably without deleting linked tasks or habit history', async () => {
    const { store, storage } = setup(); await store.saveGoal({ title: 'Goal', target: '', description: '' }); const goal = (await store.snapshot()).goals[0]!;
    const task = await store.createTask({ title: 'Linked', scheduled: '2026-10-30', goal: goal.id });
    await store.saveHabit({ title: 'Habit', days: [5], description: '' }); const habit = (await store.snapshot()).habits[0]!; await store.toggleHabit(habit.path, '2026-10-30');
    const habitText = await storage.read(habit.path); await store.deleteGoal(goal.path); await store.deleteHabit(habit.path);
    const data = await store.snapshot(); expect(data.goals).toHaveLength(0); expect(data.habits).toHaveLength(0); expect(storage.exists(task)).toBe(true); expect(data.tasks[0]!.goal).toBe(goal.id);
    expect(storage.trashed.get(habit.path)).toBe(habitText); expect(storage.trashed.has(goal.path)).toBe(true);
    await expect(store.deleteGoal(task)).rejects.toThrow();
    storage.files.set(goal.path, storage.trashed.get(goal.path)!); storage.files.set(habit.path, habitText);
    expect((await store.snapshot()).goals[0]!.id).toBe(goal.id); expect((await store.snapshot()).habits[0]!.completions).toEqual(['2026-10-30']);
  });
  it('toggles one day without losing other dates and rejects future/rest days', async () => {
    const { store, setDate } = setup(); await store.saveHabit({ title: 'Read', days: [1, 3, 5], description: '' }); const path = (await store.snapshot()).habits[0]!.path;
    await store.toggleHabit(path, '2026-10-30'); setDate('2026-11-02'); await store.toggleHabit(path, '2026-11-02');
    expect((await store.snapshot()).habits[0]!.completions).toEqual(['2026-10-30', '2026-11-02']);
    await store.toggleHabit(path, '2026-10-30'); expect((await store.snapshot()).habits[0]!.completions).toEqual(['2026-11-02']);
    await expect(store.toggleHabit(path, '2026-11-04')).rejects.toThrow('Будущие'); await expect(store.toggleHabit(path, '2026-11-01')).rejects.toThrow('не запланирована');
  });
  it('retains history and custom fields when a habit is edited or archived', async () => {
    const { store } = setup(); await store.saveHabit({ title: 'Read', days: [5], description: 'Notes' }); const habit = (await store.snapshot()).habits[0]!;
    await store.toggleHabit(habit.path, '2026-10-30'); await store.saveHabit({ ...habit, title: 'Read more', archived: true });
    expect((await store.snapshot()).habits[0]).toMatchObject({ title: 'Read more', archived: true, completions: ['2026-10-30'] });
  });
});
describe('folder migration and notes', () => {
  it('creates period notes only by explicit request, using ISO week year', async () => {
    const { store, storage } = setup(); await store.snapshot(); expect(storage.files.size).toBe(0);
    const path = await store.ensureNote('week', '2027-01-01'); expect(path).toBe('_todotracking/weeks/2026-W53.md');
    await store.ensureNote('week', '2027-01-02'); expect(storage.files.size).toBe(1);
  });
  it('moves all planner documents and stops if any destination collides', async () => {
    const { store, storage } = setup(); await store.createTask({ title: 'A', scheduled: '2026-10-30' }); await store.ensureNote('day', '2026-10-30');
    await store.moveRoot('Plans/My tracker'); expect(store.settings.root).toBe('Plans/My tracker'); expect(storage.list().every(p => p.startsWith('Plans/My tracker/'))).toBe(true);
    expect((await store.snapshot()).tasks).toHaveLength(1);
    const path = storage.list()[0]!; storage.files.set(path.replace('Plans/My tracker', 'Conflict'), 'My own file');
    await expect(store.moveRoot('Conflict')).rejects.toThrow('уже существует'); expect(store.settings.root).toBe('Plans/My tracker');
  });
  it('rolls back already moved files after an I/O error', async () => {
    const { store, storage } = setup(); await store.ensureNote('day', '2026-10-30'); const second = await store.ensureNote('week', '2026-10-30');
    storage.failMove = second; await expect(store.moveRoot('New')).rejects.toThrow('I/O');
    expect(store.settings.root).toBe('_todotracking'); expect(storage.list().every(p => p.startsWith('_todotracking/'))).toBe(true);
  });
  it('rejects escaping paths, system folders, and nested migrations', async () => {
    for (const path of ['', '/', '../secret', '_todo/../../x', '.obsidian/plugins', 'x//y', 'x/.git']) expect(() => normalizeRoot(path)).toThrow();
    const { store } = setup(); await expect(store.moveRoot('_todotracking/inside')).rejects.toThrow(); expect(normalizeRoot(' Plans\\Tracker/ ')).toBe('Plans/Tracker');
  });
});
describe('existing Markdown import', () => {
  it('ignores code fences, frontmatter and completed tasks', () => {
    expect(legacyTasks('---\ntext: "- [ ] No"\n---\n- [ ] Yes\n```md\n- [ ] No\n```\n- [x] Done\n  - [ ] Nested\n~~~\n- [ ] No\n~~~')).toEqual([{ title: 'Yes', line: 4 }, { title: 'Nested', line: 9 }]);
  });
  it('is repeatable, retains identical separate tasks, leaves source untouched', async () => {
    const { store, storage } = setup(); const text = '- [ ] Same\n- [ ] Same\n- [ ] Different'; storage.files.set('Old.md', text);
    expect(await importLegacy(store, 'Old.md', text, '2026-10-30')).toBe(3);
    expect(await importLegacy(store, 'Old.md', '\nExtra text\n' + text, '2026-10-30')).toBe(0);
    expect((await store.snapshot()).tasks).toHaveLength(3); expect(await storage.read('Old.md')).toBe(text);
  });
  it('does not silently skip or overwrite a colliding import filename', async () => {
    const { store, storage } = setup(); await importLegacy(store, 'Old.md', '- [ ] Same', '2026-10-30');
    const path = storage.list()[0]!; const original = await storage.read(path); storage.files.set(path, original.replace('"importKey":', '"otherKey":'));
    await expect(importLegacy(store, 'Old.md', '- [ ] Same', '2026-10-30')).rejects.toThrow('Конфликт');
    expect(await storage.read(path)).toContain('"otherKey":');
  });
});
