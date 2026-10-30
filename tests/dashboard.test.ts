// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { Dashboard, type DashboardHost } from '../src/ui/dashboard';
import { PlannerStore } from '../src/store';
import { DEFAULT_SETTINGS } from '../src/types';
import { codec, MemoryStorage } from './helpers';
import { dateKey, shiftDay } from '../src/dates';

afterEach(() => { document.body.replaceChildren(); });
function setup() {
  const storage = new MemoryStorage(); const store = new PlannerStore(storage, codec, { ...DEFAULT_SETTINGS });
  const root = document.createElement('div'); document.body.append(root);
  const messages: string[] = [];
  const host: DashboardHost = { notify: message => messages.push(message), openFile: async () => {}, settings: () => {}, dialog: (_title, render) => { const body = document.createElement('div'); document.body.append(body); render(body, () => body.remove()); } };
  return { storage, store, root, messages, dashboard: new Dashboard(root, store, host) };
}
describe('planner UI', () => {
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
  it('keeps incomplete tasks from a past day visible after turning rollover off', async () => {
    const { store, dashboard, root } = setup(); store.settings.autoRollover = false; await store.createTask({ title: 'Yesterday', scheduled: shiftDay(dateKey(), -1) }); await dashboard.refresh();
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
