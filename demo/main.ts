import '../styles.css';
import './preview.css';
import { dateKey, shiftDay } from '../src/dates';
import { PlannerStore } from '../src/store';
import { DEFAULT_SETTINGS, type Storage } from '../src/types';
import { Dashboard, type DashboardHost } from '../src/ui/dashboard';
import { button, el, field, input } from '../src/ui/dom';

// Same store and UI as the plugin. Only the Vault adapter is replaced in this sandbox.
class BrowserStorage implements Storage {
  private files: Record<string, string> = JSON.parse((localStorage.getItem('smart-todo-demo-v1') ?? localStorage.getItem('dayline-demo-v1')) ?? '{}');
  private persist(): void { localStorage.setItem('smart-todo-demo-v1', JSON.stringify(this.files)); }
  list(): string[] { return Object.keys(this.files).filter(path => !path.startsWith('.trash/')); }
  async exists(path: string): Promise<boolean> { return Object.hasOwn(this.files, path); }
  async read(path: string): Promise<string> { const text = this.files[path]; if (text === undefined) throw new Error('Файл не найден'); return text; }
  async create(path: string, content: string): Promise<void> { if (await this.exists(path)) throw new Error('Файл уже существует'); this.files[path] = content; this.persist(); }
  async process(path: string, update: (content: string) => string): Promise<void> { const text = await this.read(path); this.files[path] = update(text); this.persist(); }
  async move(from: string, to: string): Promise<void> { if (await this.exists(to)) throw new Error('Файл уже существует'); this.files[to] = await this.read(from); delete this.files[from]; this.persist(); }
  async trash(path: string): Promise<void> { const content = await this.read(path); this.files[`.trash/${Date.now()}/${path}`] = content; delete this.files[path]; this.persist(); }
}
// JSON scalar values and arrays are valid YAML. This lightweight codec is preview-only;
// Obsidian's full YAML parser is used in the actual plugin, including nested YAML history.
const codec = {
  stringify: (data: Record<string, unknown>) => Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n'),
  parse: (text: string): Record<string, unknown> => Object.fromEntries(text.split('\n').filter(Boolean).map(line => { const i = line.indexOf(':'); return [line.slice(0, i), JSON.parse(line.slice(i + 1).trim())]; })),
};
const storage = new BrowserStorage();
const store = new PlannerStore(storage, codec, { ...DEFAULT_SETTINGS, ...JSON.parse((localStorage.getItem('smart-todo-demo-settings') ?? localStorage.getItem('dayline-demo-settings')) ?? '{}') });
const today = dateKey();
if (!storage.list().length) {
  await store.saveGoal({ title: 'Запустить свой проект', target: shiftDay(today, 60), description: 'Превратить идею в то, чем хочется пользоваться каждый день.' });
  await store.saveGoal({ title: 'Больше энергии каждый день', target: shiftDay(today, 90), description: 'Движение, спокойный сон и время для себя.' });
  const goal = (await store.snapshot()).goals.find(g => g.title === 'Запустить свой проект')!;
  await store.createTask({ title: 'Выбрать три главных шага для проекта', scheduled: today, goal: goal.id, priority: 'high', description: 'Небольшие действия, которые приблизят к первому результату.' });
  await store.createTask({ title: 'Прогуляться без телефона', scheduled: today, priority: 'normal' });
  await store.createTask({ title: 'Разобрать заметки и освободить голову', scheduled: shiftDay(today, -1), priority: 'low' });
  const done = await store.createTask({ title: 'Начать утро без спешки', scheduled: today }); await store.setTaskStatus(done, 'done');
  await store.createTask({ title: 'Прочитать 20 страниц', scheduled: today, recurrence: 'daily' });
  await store.createTask({ title: 'Собрать первую версию проекта', scheduled: today, scope: 'week', goal: goal.id, priority: 'high' });
  await store.createTask({ title: 'Найти время для длинной прогулки', scheduled: today, scope: 'week' });
  await store.createTask({ title: 'Подвести итоги и выбрать следующий шаг', scheduled: today, scope: 'month', goal: goal.id });
  await store.createTask({ title: 'Создать продукт, которым пользуюсь каждый день', scheduled: today, scope: 'year', goal: goal.id });
  for (const title of ['Выпить стакан воды', 'Почитать 20 минут', 'Двигаться каждый день']) {
    await store.saveHabit({ title, days: [0, 1, 2, 3, 4, 5, 6], description: '' });
    const habit = (await store.snapshot()).habits.find(h => h.title === title)!;
    await storage.process(habit.path, content => content.replace(`created: "${today}"`, `created: "${shiftDay(today, -84)}"`));
    for (let i = -83; i < 0; i++) if ((i + title.length) % 5 !== 0) await store.toggleHabit(habit.path, shiftDay(today, i));
    if (title === 'Выпить стакан воды') await store.toggleHabit(habit.path, today);
  }
}
function notify(message: string): void { const toast = el('div', 'demo-toast', message); toast.setAttribute('role', 'status'); document.body.append(toast); window.setTimeout(() => toast.remove(), 5000); }
function dialog(title: string, render: (body: HTMLElement, close: () => void) => void): void {
  const previous = document.activeElement as HTMLElement | null;
  const modal = el('dialog', 'dl-modal demo-dialog'); const header = el('div', 'demo-dialog-header'); header.append(el('h2', '', title), button('Закрыть', () => modal.close(), 'dl-icon-button', 'close')); const body = el('div', 'dl-dialog'); modal.append(header, body); document.body.append(modal); render(body, () => modal.close());
  modal.addEventListener('close', () => { modal.remove(); previous?.focus(); }); modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) modal.close(); } }); modal.showModal();
}
const host: DashboardHost = {
  notify,
  dialog,
  persistSettings: async () => { localStorage.setItem('smart-todo-demo-settings', JSON.stringify(store.settings)); },
  openFile: async path => { const text = await storage.read(path); dialog('Markdown · ' + path.split('/').pop(), (body, close) => { const editor = el('textarea', 'demo-source'); editor.value = text; editor.spellcheck = false; body.append(el('p', 'dl-subtitle', path), editor, button('Сохранить Markdown', () => { void storage.process(path, () => editor.value).then(async () => { close(); await dashboard.refresh(); }); }, 'dl-button dl-button-primary')); }); },
  settings: () => dialog('Настройки Smart Todo · демо', (body, close) => {
    body.append(el('p', 'dl-subtitle', 'Это браузерная песочница. Данные сохраняются только в localStorage этого браузера. В Obsidian используются файлы вашего хранилища.'));
    const root = input(store.settings.root); body.append(field('Папка планировщика', root));
    body.append(button('Сохранить', () => { void (async () => { try { await store.moveRoot(root.value); localStorage.setItem('smart-todo-demo-settings', JSON.stringify(store.settings)); close(); await dashboard.refresh(); } catch (e) { notify(String(e)); } })(); }, 'dl-button dl-button-primary'));
    body.append(button('Скачать все Markdown-файлы', () => { void (async () => { const files: Record<string, string> = {}; for (const path of storage.list()) files[path] = await storage.read(path); const url = URL.createObjectURL(new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' })); const link = el('a'); link.href = url; link.download = 'smart-todo-demo-files.json'; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); })(); }, 'dl-button dl-button-secondary'));
  }),
};
const dashboard = new Dashboard(document.querySelector<HTMLElement>('#app')!, store, host); await dashboard.refresh();
