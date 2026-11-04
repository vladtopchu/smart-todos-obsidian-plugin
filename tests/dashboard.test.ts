// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { Dashboard, type DashboardHost } from '../src/ui/dashboard';
import { PlannerStore } from '../src/store';
import { DEFAULT_SETTINGS } from '../src/types';
import { codec, MemoryStorage } from './helpers';
import { dateKey, shiftDay } from '../src/dates';

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
function setup() {
  const storage = new MemoryStorage(); const store = new PlannerStore(storage, codec, { ...DEFAULT_SETTINGS });
  const root = document.createElement('div'); document.body.append(root);
  const messages: string[] = [];
  const host: DashboardHost = { notify: message => messages.push(message), openFile: async () => {}, settings: () => {}, dialog: (_title, render) => { const body = document.createElement('div'); document.body.append(body); render(body, () => body.remove()); } };
  return { storage, store, root, messages, host, dashboard: new Dashboard(root, store, host) };
}
describe('planner UI', () => {
  it('appends new tasks and preserves row order in creation sorting when priority and completion change', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 1, 12));
    const { store, dashboard, root } = setup();
    const first = await store.createTask({ title: 'First', scheduled: dateKey(), priority: 'low' });
    await store.createTask({ title: 'Second', scheduled: dateKey(), priority: 'high' });
    await dashboard.refresh();
    root.querySelector<HTMLButtonElement>('[aria-label="Сортировать по созданию"]')!.click();
    const titles = () => [...root.querySelectorAll('.dl-task-title')].map(node => node.textContent);
    expect(titles()).toEqual(['First', 'Second']);
    await store.setTaskStatus(first, 'done');
    await store.createTask({ title: 'Third', scheduled: dateKey() });
    await dashboard.refresh();
    expect(titles()).toEqual(['First', 'Second', 'Third']);
  });
  it('defaults to new unfinished, carried unfinished, then completed tasks, preserving creation order inside groups', async () => {
    const { store, dashboard, root } = setup();
    const today = dateKey(); const yesterday = shiftDay(today, -1);
    const oldDone = await store.createTask({ title: 'Late completion', scheduled: yesterday });
    await store.setTaskStatus(oldDone, 'done');
    const newDone = await store.createTask({ title: 'Done today', scheduled: today });
    await store.setTaskStatus(newDone, 'done');
    await store.createTask({ title: 'Old first', scheduled: shiftDay(today, -5), priority: 'low' });
    await store.createTask({ title: 'New first', scheduled: today, priority: 'low' });
    await store.createTask({ title: 'Old second', scheduled: yesterday, priority: 'high' });
    await store.createTask({ title: 'New second', scheduled: today, priority: 'high' });
    await store.createTask({ title: 'Future', scheduled: shiftDay(today, 1) });
    const cancelled = await store.createTask({ title: 'Cancelled', scheduled: today });
    await store.setTaskStatus(cancelled, 'cancelled');
    await dashboard.refresh();
    expect([...root.querySelectorAll('.dl-task-title')].map(node => node.textContent)).toEqual(['New first', 'New second', 'Old first', 'Old second', 'Late completion', 'Done today']);
    expect(root.querySelector('.dl-overdue-banner')?.textContent).toContain('2');
    expect(root.querySelector('.dl-task-group-heading')?.textContent).toBe('Выполненные · 2');
  });
  it('moves completed tasks to the bottom and restores new and carried tasks to their groups on reopening', async () => {
    const { store, dashboard, root } = setup();
    await store.createTask({ title: 'New', scheduled: dateKey() });
    await store.createTask({ title: 'Old', scheduled: shiftDay(dateKey(), -1) });
    await store.createTask({ title: 'Another new', scheduled: dateKey() });
    await dashboard.refresh();
    const titles = () => [...root.querySelectorAll('.dl-task-title')].map(node => node.textContent);
    const click = (label: string) => root.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!.click();
    click('Выполнить: New');
    await vi.waitFor(() => expect(titles()).toEqual(['Another new', 'Old', 'New']));
    click('Выполнить: Old');
    await vi.waitFor(() => expect(titles()).toEqual(['Another new', 'New', 'Old']));
    expect(root.querySelector('.dl-overdue-banner')).toBeNull();
    click('Вернуть в работу: New');
    await vi.waitFor(() => expect(titles()).toEqual(['New', 'Another new', 'Old']));
    click('Вернуть в работу: Old');
    await vi.waitFor(() => expect(root.querySelector('.dl-overdue-banner')).not.toBeNull());
    expect(titles()).toEqual(['New', 'Another new', 'Old']);
    expect(root.querySelector('.dl-task-group-heading')).toBeNull();
  });
  it('restores the previous display, persists the choice across reopening, and toggles back without writing tasks', async () => {
    const { store, storage, dashboard, root, host } = setup();
    const first = await store.createTask({ title: 'Done first', scheduled: dateKey() });
    await store.setTaskStatus(first, 'done');
    await store.createTask({ title: 'Old', scheduled: shiftDay(dateKey(), -1) });
    await store.createTask({ title: 'New', scheduled: dateKey() });
    let saved = structuredClone(store.settings);
    let activeStore = store;
    host.persistSettings = vi.fn(async () => { saved = structuredClone(activeStore.settings); });
    await dashboard.refresh();
    const original = [...storage.files]; const process = vi.spyOn(storage, 'process'); const create = vi.spyOn(storage, 'create');
    const titles = () => [...root.querySelectorAll('.dl-task-title')].map(node => node.textContent);
    expect(titles()).toEqual(['New', 'Old', 'Done first']);
    root.querySelector<HTMLButtonElement>('[aria-label="Сортировать по созданию"]')!.click();
    expect(titles()).toEqual(['Done first', 'New', 'Old']);
    expect(saved.dayTaskSort).toBe('created'); expect(host.persistSettings).toHaveBeenCalledTimes(1);
    dashboard.destroy();
    activeStore = new PlannerStore(storage, codec, saved);
    const reopened = new Dashboard(root, activeStore, host);
    await reopened.refresh();
    expect(titles()).toEqual(['Done first', 'New', 'Old']);
    root.querySelector<HTMLButtonElement>('[aria-label="Группировать по статусу"]')!.click();
    expect(titles()).toEqual(['New', 'Old', 'Done first']);
    expect(saved.dayTaskSort).toBe('status'); expect(host.persistSettings).toHaveBeenCalledTimes(2);
    expect(process).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled(); expect([...storage.files]).toEqual(original);
  });
  it('keeps filters, search and hidden completions working with daily grouping', async () => {
    const { store, dashboard, root } = setup();
    const done = await store.createTask({ title: 'Match done', scheduled: dateKey() }); await store.setTaskStatus(done, 'done');
    await store.createTask({ title: 'Other', scheduled: dateKey() });
    await store.createTask({ title: 'Match old', scheduled: shiftDay(dateKey(), -1) });
    await store.createTask({ title: 'Match new', scheduled: dateKey() });
    await dashboard.refresh();
    const titles = () => [...root.querySelectorAll('.dl-task-title')].map(node => node.textContent);
    const search = root.querySelector<HTMLInputElement>('[data-focus="search"]')!; search.value = 'Match'; search.dispatchEvent(new Event('input'));
    expect(titles()).toEqual(['Match new', 'Match old', 'Match done']);
    store.settings.showCompleted = false; await dashboard.refresh();
    expect(titles()).toEqual(['Match new', 'Match old']); expect(root.querySelector('.dl-task-group-heading')).toBeNull();
    root.querySelector<HTMLButtonElement>('.dl-tab[aria-label="Готово"]')!.click();
    expect(titles()).toEqual(['Match done']); expect(root.querySelector('.dl-task-sort')).toBeNull();
    root.querySelector<HTMLButtonElement>('.dl-tab[aria-label="В работе"]')!.click();
    expect(titles()).toEqual(['Match new', 'Match old']); expect(root.querySelector('.dl-task-sort')).toBeNull();
    root.querySelector<HTMLButtonElement>('.dl-tab[aria-label="Все"]')!.click();
    expect(root.querySelector('[aria-label="Сортировать по созданию"]')).not.toBeNull();
  });
  it('groups tasks on historical and future days while keeping other horizons in their existing order', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 4, 12));
    const { store, dashboard, root } = setup();
    const today = dateKey();
    for (const offset of [-1, 1]) {
      const selected = shiftDay(today, offset);
      const done = await store.createTask({ title: `Done ${offset}`, scheduled: selected }); await store.setTaskStatus(done, 'done');
      await store.createTask({ title: `Open ${offset}`, scheduled: selected });
    }
    await dashboard.refresh();
    const titles = () => [...root.querySelectorAll('.dl-task-title')].map(node => node.textContent);
    for (const offset of [-1, 1]) {
      dashboard.navigate('day', shiftDay(today, offset));
      expect(titles()).toEqual([`Open ${offset}`, `Done ${offset}`]); expect(root.querySelector('.dl-overdue-banner')).toBeNull();
    }
    for (const scope of ['week', 'month', 'year'] as const) {
      dashboard.navigate(scope, today);
      const expected = (await store.snapshot()).tasks.map(task => task.title);
      expect(titles()).toEqual(expected); expect(root.querySelector('.dl-task-sort')).toBeNull();
    }
    dashboard.navigate('day', today); root.querySelector<HTMLButtonElement>('[aria-label="Сортировать по созданию"]')!.click();
    dashboard.navigate('week', today); dashboard.navigate('day', today);
    expect(root.querySelector('[aria-label="Группировать по статусу"]')).not.toBeNull();
  });
  it('follows today across midnight without writing task files and leaves a chosen historical day alone', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 31, 23, 59));
    const { store, storage, dashboard, root } = setup();
    const path = await store.createTask({ title: 'Unfinished', scheduled: '2026-10-31' });
    const original = await storage.read(path);
    await dashboard.refresh();
    const process = vi.spyOn(storage, 'process');
    vi.setSystemTime(new Date(2026, 10, 1, 0, 1)); await dashboard.refresh();
    expect(root.querySelector('h1')?.textContent).toContain('1 ноября');
    expect(root.querySelector('.dl-overdue-banner')?.textContent).toContain('1');
    expect(root.textContent).toContain('В плане с 31 октября');
    dashboard.navigate('day', '2026-10-30');
    vi.setSystemTime(new Date(2026, 10, 2)); await dashboard.refresh();
    expect(root.querySelector('h1')?.textContent).toContain('30 октября');
    expect(process).not.toHaveBeenCalled(); expect(await storage.read(path)).toBe(original);
  });
  it('shows a late completion today, removes it from carry-over, and counts it once in statistics', async () => {
    const { store, dashboard, root } = setup();
    const path = await store.createTask({ title: 'Finished late', scheduled: shiftDay(dateKey(), -40) });
    await store.setTaskStatus(path, 'done'); await dashboard.refresh();
    expect(root.querySelector('.dl-task-title')?.textContent).toBe('Finished late');
    expect(root.querySelector('.dl-overdue-banner')).toBeNull();
    dashboard.navigate('stats');
    const stat = [...root.querySelectorAll('.dl-stat')].find(node => node.textContent?.includes('Выполнено за период'));
    expect(stat?.querySelector('strong')?.textContent).toBe('1');
    expect(root.textContent).not.toContain('Переносов');
  });
  it('browses whole weeks across year boundaries without switching into days', async () => {
    const { dashboard, root } = setup(); await dashboard.refresh(); dashboard.navigate('week', '2026-12-31');
    expect(root.querySelector('.dl-week-strip')).toBeNull(); expect(root.querySelectorAll('.dl-week-choice')).toHaveLength(3);
    root.querySelector<HTMLButtonElement>('[aria-label="Следующая неделя"]')!.click();
    expect(root.querySelector('h1')!.textContent).toContain('4 января');
    expect(root.querySelector('[aria-current="page"]')!.textContent).toBe('Неделя');
    root.querySelector<HTMLButtonElement>('.dl-week-choice')!.click(); expect(root.querySelector('[aria-current="page"]')!.textContent).toBe('Неделя');
  });
  it('always opens My day when clicking the calendar from another view', async () => {
    const { dashboard, root, storage } = setup(); await dashboard.refresh();
    for (const screen of ['week', 'month', 'year', 'stats', 'habits', 'goals'] as const) {
      dashboard.navigate(screen); root.querySelector<HTMLButtonElement>('.dl-calendar-day')!.click();
      expect(root.querySelector('[aria-current="page"]')!.textContent).toBe('Мой день');
    }
    expect(storage.files.size).toBe(0);
  });
  it('shows read-only habit analysis in larger horizons, with no marking or creation buttons', async () => {
    const { dashboard, root, store } = setup(); await store.saveHabit({ title: 'Read', days: [0, 1, 2, 3, 4, 5, 6], description: '' }); await dashboard.refresh();
    for (const screen of ['week', 'month', 'year'] as const) {
      dashboard.navigate(screen); expect(root.querySelector('.dl-habit-analysis')!.textContent).toContain('Read');
      expect(root.querySelector('.dl-habit-daily, .dl-add-habit, .dl-habit-cell')).toBeNull();
    }
    dashboard.navigate('day', dateKey()); expect(root.querySelector('.dl-habit-daily')).not.toBeNull();
  });
  it('keeps statistics out of working screens and counts completions in their actual period', async () => {
    const { store, dashboard, root } = setup();
    const path = await store.createTask({ title: 'Done today', scheduled: shiftDay(dateKey(), -20) }); await store.setTaskStatus(path, 'done');
    for (const screen of ['day', 'week', 'goals', 'habits'] as const) { await dashboard.refresh(); dashboard.navigate(screen); expect(root.querySelector('[role="progressbar"], .dl-stats, .dl-heatmap, .dl-streak')).toBeNull(); }
    dashboard.navigate('stats');
    const stat = [...root.querySelectorAll('.dl-stat')].find(el => el.textContent?.includes('Выполнено за период'));
    expect(stat?.querySelector('strong')?.textContent).toBe('1'); expect(root.querySelector('.dl-statistics')).not.toBeNull();
  });
  it('preserves the quick-add draft when toggling task-only mode and can restore panels', async () => {
    const { store, dashboard, root } = setup(); await dashboard.refresh();
    const quick = root.querySelector<HTMLInputElement>('[data-focus="quick"]')!; quick.value = 'Draft'; quick.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('[aria-label="Только задачи"]')!.click();
    expect(root.classList.contains('dl-tasks-only')).toBe(true); expect(store.settings.tasksOnly).toBe(true);
    expect(root.querySelector<HTMLInputElement>('[data-focus="quick"]')!.value).toBe('Draft');
    root.querySelector<HTMLButtonElement>('[aria-label="Показать панели"]')!.click(); expect(root.classList.contains('dl-tasks-only')).toBe(false);
  });
  it('opens full creation from the quick-add button with its draft, date and horizon, and preserves the draft on cancel', async () => {
    const { dashboard, root, storage } = setup(); await dashboard.refresh(); dashboard.navigate('week', '2026-12-31');
    const quick = root.querySelector<HTMLInputElement>('[data-focus="quick"]')!; quick.value = 'My draft'; quick.dispatchEvent(new Event('input'));
    const more = root.querySelector<HTMLButtonElement>('[aria-label="Полное создание задачи"]')!;
    expect(more.type).toBe('button'); expect(more.querySelector('svg')).not.toBeNull(); more.click();
    const form = document.querySelector<HTMLFormElement>('.dl-form')!;
    expect(form.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe('My draft');
    expect(form.querySelector<HTMLInputElement>('input[type="date"]')!.value).toBe('2026-12-28');
    expect(form.querySelector<HTMLSelectElement>('select')!.value).toBe('week');
    form.querySelector<HTMLButtonElement>('[aria-label="Отмена"]')!.click();
    expect(storage.files.size).toBe(0); expect(quick.value).toBe('My draft');
  });
  it('creates one fully configured task from quick-add and clears the draft only after saving', async () => {
    const { dashboard, root, store } = setup(); await store.saveGoal({ title: 'Goal', target: '', description: '' }); await dashboard.refresh();
    root.querySelector<HTMLButtonElement>('[aria-label="Только задачи"]')!.click();
    const quick = root.querySelector<HTMLInputElement>('[data-focus="quick"]')!; quick.value = 'Configured'; quick.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('[aria-label="Полное создание задачи"]')!.click();
    const form = document.querySelector<HTMLFormElement>('.dl-form')!;
    const selects = form.querySelectorAll<HTMLSelectElement>('.dl-form-grid select');
    selects[1]!.value = 'high'; selects[2]!.value = 'custom'; selects[2]!.dispatchEvent(new Event('change')); selects[3]!.value = (await store.snapshot()).goals[0]!.id;
    form.querySelector<HTMLInputElement>('[aria-label="Интервал повтора"]')!.value = '3'; form.querySelector<HTMLSelectElement>('[aria-label="Единица интервала"]')!.value = 'monthly';
    form.querySelector<HTMLInputElement>('[aria-label="Название метки"]')!.value = 'Дом';
    form.querySelector<HTMLTextAreaElement>('textarea')!.value = 'Details [[link]]';
    form.querySelectorAll<HTMLInputElement>('input[type="date"]')[1]!.value = '2027-01-01';
    await form.onsubmit!(new Event('submit', { cancelable: true }) as SubmitEvent);
    const data = await store.snapshot(); expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]).toMatchObject({ title: 'Configured', scheduled: dateKey(), scope: 'day', priority: 'high', recurrence: 'monthly', recurrenceInterval: 3, goal: data.goals[0]!.id, due: '2027-01-01', description: 'Details [[link]]', labels: [{ name: 'Дом', color: 'blue' }] });
    expect(root.querySelector<HTMLInputElement>('[data-focus="quick"]')!.value).toBe(''); expect(root.querySelector('.dl-task-repeat')!.textContent).toBe('Раз в 3 месяца');
    root.querySelector<HTMLButtonElement>('.dl-task-title')!.click();
    const edit = document.querySelector<HTMLFormElement>('.dl-form')!;
    expect(edit.querySelector<HTMLInputElement>('[aria-label="Интервал повтора"]')!.value).toBe('3');
    expect(edit.querySelector<HTMLSelectElement>('[aria-label="Единица интервала"]')!.value).toBe('monthly');
    expect(edit.querySelector<HTMLElement>('.dl-repeat-interval')!.hidden).toBe(false);
    const repeat = edit.querySelectorAll<HTMLSelectElement>('.dl-form-grid select')[2]!; repeat.value = 'weekly'; repeat.dispatchEvent(new Event('change'));
    expect(edit.querySelector<HTMLInputElement>('[aria-label="Интервал повтора"]')!.disabled).toBe(true);
    await edit.onsubmit!(new Event('submit', { cancelable: true }) as SubmitEvent);
    expect((await store.snapshot()).tasks[0]).toMatchObject({ recurrence: 'weekly', recurrenceInterval: 1 });
  });
  it('keeps the creation form open on an invalid custom interval or a non-daily repeat', async () => {
    const { dashboard, root, storage } = setup(); await dashboard.refresh(); root.querySelector<HTMLButtonElement>('[aria-label="Полное создание задачи"]')!.click();
    const form = document.querySelector<HTMLFormElement>('.dl-form')!; form.querySelector<HTMLInputElement>('input[type="text"]')!.value = 'Invalid interval';
    const selects = form.querySelectorAll<HTMLSelectElement>('.dl-form-grid select'); selects[2]!.value = 'custom'; selects[2]!.dispatchEvent(new Event('change'));
    form.querySelector<HTMLInputElement>('[aria-label="Интервал повтора"]')!.value = '0';
    await form.onsubmit!(new Event('submit', { cancelable: true }) as SubmitEvent);
    expect(form.querySelector('[role="alert"]')!.textContent).toContain('Интервал'); expect(storage.files.size).toBe(0);
    form.querySelector<HTMLInputElement>('[aria-label="Интервал повтора"]')!.value = '2'; selects[0]!.value = 'week';
    await form.onsubmit!(new Event('submit', { cancelable: true }) as SubmitEvent);
    expect(form.querySelector('[role="alert"]')!.textContent).toContain('горизонт «День»'); expect(storage.files.size).toBe(0);
  });
  it('saves a typed colored label without requiring an extra add click', async () => {
    const { store, dashboard } = setup(); await dashboard.refresh(); dashboard.taskDialog();
    const form = document.querySelector<HTMLFormElement>('.dl-form')!;
    form.querySelector<HTMLInputElement>('input[type="text"]')!.value = 'Labeled task';
    form.querySelector<HTMLInputElement>('[aria-label="Название метки"]')!.value = 'Работа';
    form.querySelector<HTMLSelectElement>('[aria-label="Цвет метки"]')!.value = 'red';
    await form.onsubmit!(new Event('submit', { cancelable: true }) as SubmitEvent);
    expect((await store.snapshot()).tasks[0]!.labels).toEqual([{ name: 'Работа', color: 'red' }]);
  });
  it('remembers labels after their last task is deleted and reuses them after reopening', async () => {
    const { store, dashboard, root, storage, host } = setup();
    let saved = { ...store.settings };
    host.persistSettings = vi.fn(async () => { saved = structuredClone(store.settings); });
    const path = await store.createTask({ title: 'Source', scheduled: dateKey(), labels: [{ name: 'Работа', color: 'purple' }] });
    await dashboard.refresh();
    expect(host.persistSettings).toHaveBeenCalledTimes(1);
    await store.deleteTask(path); await dashboard.refresh();
    expect(host.persistSettings).toHaveBeenCalledTimes(1);
    dashboard.destroy();
    const reopened = new Dashboard(root, new PlannerStore(storage, codec, saved), host);
    await reopened.refresh(); reopened.taskDialog();
    const form = document.querySelector<HTMLFormElement>('.dl-form')!;
    const choice = form.querySelector<HTMLButtonElement>('.dl-label-suggestions button')!;
    expect(choice.textContent).toBe('Работа'); choice.click();
    form.querySelector<HTMLInputElement>('input[type="text"]')!.value = 'Reused';
    await form.onsubmit!(new Event('submit', { cancelable: true }) as SubmitEvent);
    expect((await store.snapshot()).tasks[0]!.labels).toEqual([{ name: 'Работа', color: 'purple' }]);
  });
  it('searches saved labels, deduplicates names ignoring case and prevents duplicate selection', async () => {
    const { store, dashboard } = setup();
    store.settings.labelPresets = [{ name: 'Работа', color: 'red' }, { name: 'Дом', color: 'blue' }];
    await store.createTask({ title: 'Source', scheduled: dateKey(), labels: [{ name: 'работа', color: 'green' }] });
    await dashboard.refresh(); dashboard.taskDialog();
    const group = document.querySelector('.dl-label-editor')!;
    expect(group.querySelectorAll('.dl-label-suggestions button')).toHaveLength(2);
    const name = group.querySelector<HTMLInputElement>('[aria-label="Название метки"]')!;
    name.value = 'РАБ'; name.dispatchEvent(new Event('input'));
    expect(group.querySelectorAll('.dl-label-suggestions button')).toHaveLength(1);
    group.querySelector<HTMLButtonElement>('.dl-label-suggestions button')!.click();
    const selected = [...group.querySelectorAll<HTMLButtonElement>('.dl-label-suggestions button')].find(button => button.textContent === 'Работа')!;
    expect(selected.disabled).toBe(true); expect(selected.classList.contains('dl-label-red')).toBe(true);
    selected.click(); expect(group.querySelector('.dl-label-chips')!.children).toHaveLength(1);
  });
  it('retries saving the label library after a settings write fails', async () => {
    const { store, dashboard, host, messages } = setup();
    host.persistSettings = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
    await store.createTask({ title: 'Source', scheduled: dateKey(), labels: [{ name: 'Дом', color: 'green' }] });
    await dashboard.refresh(); expect(messages).toHaveLength(1);
    await dashboard.refresh(); expect(host.persistSettings).toHaveBeenCalledTimes(2);
    await dashboard.refresh(); expect(host.persistSettings).toHaveBeenCalledTimes(2);
  });
  it('completes and reopens a task with its labelled native checkbox', async () => {
    const { store, dashboard, root } = setup();
    await store.createTask({ title: 'Check me', scheduled: dateKey() }); await dashboard.refresh();
    const checkbox = () => root.querySelector<HTMLInputElement>('.dl-checkbox')!;
    expect(checkbox().labels?.[0]?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    checkbox().click();
    await vi.waitFor(() => expect(checkbox().getAttribute('aria-label')).toBe('Вернуть в работу: Check me'));
    expect(checkbox().checked).toBe(true);
    expect((await store.snapshot()).tasks[0]!.status).toBe('done');
    expect(checkbox().getAttribute('aria-label')).toBe('Вернуть в работу: Check me');
    checkbox().click();
    await vi.waitFor(() => expect(checkbox().getAttribute('aria-label')).toBe('Выполнить: Check me'));
    expect(checkbox().checked).toBe(false);
    expect((await store.snapshot()).tasks[0]!.status).toBe('open');
  });
  it('browses calendar and period views without writing any note', async () => {
    const { storage, dashboard, root } = setup(); await dashboard.refresh();
    for (const node of root.querySelectorAll<HTMLButtonElement>('.dl-calendar-day')) node.click();
    dashboard.navigate('week'); dashboard.navigate('month'); dashboard.navigate('year');
    expect(storage.files.size).toBe(0); expect(root.querySelector('h1')).not.toBeNull(); dashboard.destroy();
  });
  it('renders task strings as text, including untrusted HTML', async () => {
    const { store, dashboard, root } = setup(); await store.createTask({ title: '<img src=x onerror=alert(1)>', scheduled: dateKey() }); await dashboard.refresh();
    expect(root.querySelector('.dl-task-title')!.textContent).toContain('<img'); expect(root.querySelector('img')).toBeNull();
  });
  it('keeps incomplete tasks from a past day visible without changing their dates', async () => {
    const { store, dashboard, root } = setup(); await store.createTask({ title: 'Yesterday', scheduled: shiftDay(dateKey(), -1) }); await dashboard.refresh();
    expect(root.querySelector('.dl-overdue-banner')?.textContent).toContain('1');
  });
  it('shows week plans and contained daily tasks, while excluding month/year plans', async () => {
    const { store, dashboard, root } = setup();
    for (const scope of ['day', 'week', 'month', 'year'] as const) await store.createTask({ title: `${scope}-task`, scheduled: dateKey(), scope });
    await dashboard.refresh(); dashboard.navigate('week');
    const titles = [...root.querySelectorAll('.dl-task-list .dl-task-title')].map(n => n.textContent);
    expect(titles).toContain('day-task'); expect(titles).toContain('week-task'); expect(titles).not.toContain('month-task');
  });
});
