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
  it('appends new tasks and preserves row order when priority and completion change', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 1, 12));
    const { store, dashboard, root } = setup();
    const first = await store.createTask({ title: 'First', scheduled: dateKey(), priority: 'low' });
    await store.createTask({ title: 'Second', scheduled: dateKey(), priority: 'high' });
    await dashboard.refresh();
    const titles = () => [...root.querySelectorAll('.dl-task-title')].map(node => node.textContent);
    expect(titles()).toEqual(['First', 'Second']);
    await store.setTaskStatus(first, 'done');
    await store.createTask({ title: 'Third', scheduled: dateKey() });
    await dashboard.refresh();
    expect(titles()).toEqual(['First', 'Second', 'Third']);
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
