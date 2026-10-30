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
