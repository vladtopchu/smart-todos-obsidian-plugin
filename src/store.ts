import { dateKey, habitDue, nextOccurrence, periodKey, validDate } from './dates';
import type { Codec, Goal, Habit, Settings, Snapshot, Storage, Task, Scope } from './types';
import { newId } from './ids';
import { normalizeLabels } from './labels';

interface Document { data: Record<string, unknown>; body: string }
const TASK_LINE = /^- \[([ xX-])\] (.*?) <!-- dayline:task -->[ \t]*$/m;
const str = (v: unknown, fallback = ''): string => typeof v === 'string' ? v : fallback;
const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => options.includes(v as T) ? v as T : fallback;
const singleLine = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();
export function normalizeRoot(input: string): string {
  const value = input.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
  if (!value || value.startsWith('/') || /[:*?"<>|\x00-\x1f]/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.'))) {
    throw new Error('Укажите папку внутри хранилища, например _todotracking. Скрытые и системные папки использовать нельзя.');
  }
  return value;
}
export class PlannerStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly storage: Storage, readonly codec: Codec, public settings: Settings, private now = () => dateKey()) {
    settings.root = normalizeRoot(settings.root);
  }
  private serial<T>(action: () => Promise<T>): Promise<T> {
    const next = this.queue.then(action, action); this.queue = next.catch(() => {}); return next;
  }
  private decode(text: string): Document {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!match) throw new Error('Отсутствуют свойства Markdown');
    const data = this.codec.parse(match[1]!);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Некорректные свойства Markdown');
    if (typeof data.id !== 'string' || !data.id) throw new Error('Отсутствует id');
    return { data, body: text.slice(match[0].length) };
  }
  private encode(doc: Document): string { return `---\n${this.codec.stringify(doc.data).trim()}\n---\n${doc.body}`; }
  private task(doc: Document, path: string): Task {
    const d = doc.data; if (!validDate(d.scheduled)) throw new Error('Некорректная дата задачи');
    const line = TASK_LINE.exec(doc.body);
    const status = line ? (line[1]!.toLowerCase() === 'x' ? 'done' : line[1] === '-' ? 'cancelled' : 'open') : pick(d.status, ['open', 'done', 'cancelled'], 'open');
    const history = Array.isArray(d.history) ? d.history.filter((h): h is Task['history'][number] => !!h && typeof h === 'object' && validDate(h.date) && ['moved', 'completed', 'reopened', 'cancelled'].includes(h.type)) : [];
    return {
      id: str(d.id), path, title: line?.[2] ?? str(d.title, 'Без названия'), status,
      scheduled: d.scheduled, scope: pick(d.scope, ['day', 'week', 'month', 'year'], 'day'),
      priority: pick(d.priority, ['normal', 'high', 'low'], 'normal'),
      recurrence: pick(d.recurrence, ['none', 'daily', 'weekdays', 'weekly', 'monthly'], 'none'),
      goal: str(d.goal), labels: normalizeLabels(d.labels), due: validDate(d.due) ? d.due : '', created: validDate(d.created) ? d.created : d.scheduled,
      completed: status === 'done' ? (validDate(d.completed) ? d.completed : d.scheduled) : '',
      history, description: doc.body.replace(TASK_LINE, '').trim(),
    };
  }
  private goal(doc: Document, path: string): Goal {
    return { id: str(doc.data.id), path, title: str(doc.data.title, 'Без названия'), target: validDate(doc.data.target) ? doc.data.target : '', status: pick(doc.data.status, ['active', 'done', 'archived'], 'active'), description: doc.body.trim() };
  }
  private habit(doc: Document, path: string): Habit {
    const d = doc.data;
    return { id: str(d.id), path, title: str(d.title, 'Без названия'), days: Array.isArray(d.days) ? [...new Set(d.days.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))] : [0, 1, 2, 3, 4, 5, 6], completions: Array.isArray(d.completions) ? [...new Set(d.completions.filter(validDate))].sort() : [], created: validDate(d.created) ? d.created : this.now(), archived: d.archived === true, description: doc.body.trim() };
  }
  async snapshot(): Promise<Snapshot> {
    await this.queue;
    const result: Snapshot = { tasks: [], goals: [], habits: [], warnings: [] };
    const root = this.settings.root;
    const paths = (await this.storage.list()).filter(p => p.startsWith(`${root}/`) && p.endsWith('.md'));
    await Promise.all(paths.map(async path => {
      const relative = path.slice(root.length + 1);
      if (!/^(tasks|goals|habits)\/[^/]+\.md$/.test(relative)) return;
      try {
        const doc = this.decode(await this.storage.read(path));
        if (doc.data.type === 'dayline-task') result.tasks.push(this.task(doc, path));
        else if (doc.data.type === 'dayline-goal') result.goals.push(this.goal(doc, path));
        else if (doc.data.type === 'dayline-habit') result.habits.push(this.habit(doc, path));
      } catch (error) { result.warnings.push(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
    }));
    result.tasks.sort((a, b) => a.scheduled.localeCompare(b.scheduled) || a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
    result.goals.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    result.habits.sort((a, b) => a.created.localeCompare(b.created) || a.title.localeCompare(b.title, 'ru'));
    return result;
  }
  async createTask(input: Partial<Task> & Pick<Task, 'title' | 'scheduled'>): Promise<string> {
    const title = singleLine(input.title);
    if (!title) throw new Error('Добавьте название задачи');
    if (!validDate(input.scheduled) || (input.due && !validDate(input.due))) throw new Error('Проверьте дату');
    return this.serial(async () => {
      const id = newId(); const path = `${this.settings.root}/tasks/${id}.md`;
      const data = { type: 'dayline-task', id, title, status: 'open', scheduled: input.scheduled, scope: input.scope ?? 'day', priority: input.priority ?? 'normal', recurrence: input.recurrence ?? 'none', goal: input.goal ?? '', labels: normalizeLabels(input.labels), due: input.due ?? '', created: this.now(), completed: '', history: [] };
      await this.storage.create(path, this.encode({ data, body: `- [ ] ${title} <!-- dayline:task -->\n\n${input.description?.trim() ?? ''}\n` }));
      return path;
    });
  }
  private async mutateTask(path: string, update: (task: Task) => Partial<Task>): Promise<void> {
    await this.storage.process(path, text => {
      const doc = this.decode(text); const current = this.task(doc, path); const patch = update(current);
      if (patch.labels !== undefined) patch.labels = normalizeLabels(patch.labels);
      if (!Object.keys(patch).length) return text;
      const next = { ...current, ...patch };
      if (!singleLine(next.title) || !validDate(next.scheduled) || (next.due && !validDate(next.due))) throw new Error('Проверьте название и даты');
      for (const [key, value] of Object.entries(patch)) if (!['path', 'id', 'description'].includes(key)) doc.data[key] = value;
      doc.data.title = singleLine(next.title); doc.data.status = next.status;
      const checkbox = `- [${next.status === 'done' ? 'x' : next.status === 'cancelled' ? '-' : ' '}] ${singleLine(next.title)} <!-- dayline:task -->`;
      if (patch.description !== undefined) doc.body = `${checkbox}\n\n${patch.description.trim()}\n`;
      else if (TASK_LINE.test(doc.body)) doc.body = doc.body.replace(TASK_LINE, () => checkbox);
      else doc.body = `${checkbox}\n\n${doc.body}`;
      return this.encode(doc);
    });
  }
  updateTask(path: string, patch: Partial<Pick<Task, 'title' | 'scheduled' | 'due' | 'scope' | 'priority' | 'recurrence' | 'goal' | 'labels' | 'description'>>): Promise<void> {
    return this.serial(() => this.mutateTask(path, task => ({ ...patch, ...(patch.scheduled && patch.scheduled !== task.scheduled ? { history: [...task.history, { type: 'moved' as const, date: this.now(), from: task.scheduled }] } : {}) })));
  }
  setTaskStatus(path: string, status: Task['status']): Promise<void> {
    return this.serial(() => this.mutateTask(path, task => {
      if (task.status === status) return {};
      const today = this.now();
      if (status === 'done' && task.recurrence !== 'none') {
        // One atomic update: completing a recurring task records the occurrence and advances its date.
        // A queued second click sees the future date and cannot complete the next occurrence.
        if (task.scheduled > today || task.history.some(h => h.type === 'completed' && h.date === today)) return {};
        return { scheduled: nextOccurrence(today > task.scheduled ? today : task.scheduled, task.recurrence), status: 'open', completed: '', history: [...task.history, { type: 'completed', date: today, from: task.scheduled }] };
      }
      return { status, completed: status === 'done' ? today : '', history: [...task.history, { type: status === 'done' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'reopened', date: today }] };
    }));
  }
  deleteTask(path: string): Promise<void> {
    return this.serial(async () => {
      const prefix = `${this.settings.root}/tasks/`;
      if (!path.startsWith(prefix) || !/^[^/\\]+\.md$/.test(path.slice(prefix.length)) || path.slice(prefix.length).startsWith('.')) throw new Error('Удалять можно только файлы задач Dayline');
      const doc = this.decode(await this.storage.read(path));
      if (doc.data.type !== 'dayline-task') throw new Error('Этот файл не является задачей Dayline');
      await this.storage.trash(path);
    });
  }
  async rollover(): Promise<number> {
    if (!this.settings.autoRollover) return 0;
    const snapshot = await this.snapshot(); const today = this.now(); let count = 0;
    await this.serial(async () => {
      for (const task of snapshot.tasks) {
        if (task.status !== 'open' || task.scope !== 'day' || task.scheduled >= today) continue;
        if (task.recurrence === 'weekdays' && !habitDue([1, 2, 3, 4, 5], today)) continue;
        await this.mutateTask(task.path, current => {
          if (current.status !== 'open' || current.scope !== 'day' || current.scheduled >= today) return {};
          count++;
          return { scheduled: today, history: [...current.history, { type: 'moved', date: today, from: current.scheduled }] };
        });
      }
    });
    return count;
  }
  saveGoal(input: Pick<Goal, 'title' | 'target' | 'description'> & Partial<Pick<Goal, 'path' | 'status'>>): Promise<void> {
    if (!singleLine(input.title) || (input.target && !validDate(input.target))) return Promise.reject(new Error('Проверьте название и дату цели'));
    return this.serial(async () => {
      if (input.path) await this.storage.process(input.path, text => {
        const doc = this.decode(text); Object.assign(doc.data, { title: singleLine(input.title), target: input.target, status: input.status ?? doc.data.status }); doc.body = `${input.description.trim()}\n`; return this.encode(doc);
      });
      else { const id = newId(); await this.storage.create(`${this.settings.root}/goals/${id}.md`, this.encode({ data: { type: 'dayline-goal', id, title: singleLine(input.title), target: input.target, status: 'active' }, body: `${input.description.trim()}\n` })); }
    });
  }
  saveHabit(input: Pick<Habit, 'title' | 'days' | 'description'> & Partial<Pick<Habit, 'path' | 'archived'>>): Promise<void> {
    if (!singleLine(input.title) || !input.days.length || input.days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return Promise.reject(new Error('Укажите название и хотя бы один день недели'));
    return this.serial(async () => {
      if (input.path) await this.storage.process(input.path, text => {
        const doc = this.decode(text); Object.assign(doc.data, { title: singleLine(input.title), days: [...new Set(input.days)], archived: input.archived ?? doc.data.archived }); doc.body = `${input.description.trim()}\n`; return this.encode(doc);
      });
      else { const id = newId(); await this.storage.create(`${this.settings.root}/habits/${id}.md`, this.encode({ data: { type: 'dayline-habit', id, title: singleLine(input.title), days: [...new Set(input.days)], completions: [], created: this.now(), archived: false }, body: `${input.description.trim()}\n` })); }
    });
  }
  toggleHabit(path: string, date: string): Promise<void> {
    if (!validDate(date) || date > this.now()) return Promise.reject(new Error('Будущие дни нельзя отметить выполненными'));
    return this.serial(() => this.storage.process(path, text => {
      const doc = this.decode(text); const habit = this.habit(doc, path);
      if (!habitDue(habit.days, date) || date < habit.created) throw new Error('В этот день привычка не запланирована');
      const dates = new Set(habit.completions); if (dates.has(date)) dates.delete(date); else dates.add(date);
      doc.data.completions = [...dates].sort(); return this.encode(doc);
    }));
  }
  notePath(scope: Scope, date: string): string {
    const folder = { day: 'days', week: 'weeks', month: 'months', year: 'years' }[scope];
    return `${this.settings.root}/${folder}/${periodKey(scope, date)}.md`;
  }
  async ensureNote(scope: Scope, date: string): Promise<string> {
    const path = this.notePath(scope, date);
    return this.serial(async () => {
      if (!(await this.storage.exists(path))) {
        const title = { day: 'День', week: 'Неделя', month: 'Месяц', year: 'Год' }[scope];
        await this.storage.create(path, `---\ntype: dayline-${scope}\nperiod: "${periodKey(scope, date)}"\n---\n\n# ${title} · ${periodKey(scope, date)}\n\n## Фокус\n\n\n## Заметки\n\n\n## Итоги\n\n`);
      }
      return path;
    });
  }
  async moveRoot(input: string): Promise<void> {
    const root = normalizeRoot(input); const old = this.settings.root; if (root === old) return;
    if (root.startsWith(`${old}/`) || old.startsWith(`${root}/`)) throw new Error('Новая папка не должна быть вложена в старую или содержать её');
    await this.serial(async () => {
      const paths = (await this.storage.list()).filter(p => p.startsWith(`${old}/`));
      const moves = paths.map(from => ({ from, to: root + from.slice(old.length) }));
      for (const { to } of moves) if (await this.storage.exists(to)) throw new Error(`Файл уже существует: ${to}. Перенос отменён.`);
      const moved: typeof moves = [];
      try { for (const move of moves) { await this.storage.move(move.from, move.to); moved.push(move); } }
      catch (error) {
        const failures: string[] = [];
        for (const move of moved.reverse()) try { await this.storage.move(move.to, move.from); } catch { failures.push(move.to); }
        if (failures.length) throw new Error(`Перенос прерван. Не удалось вернуть файлы: ${failures.join(', ')}. Исходная папка: ${old}; новая: ${root}.`);
        throw error;
      }
      this.settings.root = root;
    });
  }
}
