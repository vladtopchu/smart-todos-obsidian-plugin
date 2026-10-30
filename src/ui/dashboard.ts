import { dateKey, displayDate, habitDue, habitStreak, inPeriod, parseDate, periodKey, shiftDay, stepPeriod, weekDays, weekStart } from '../dates';
import { PlannerStore } from '../store';
import type { Goal, Habit, LabelColor, Priority, Recurrence, Scope, Screen, Snapshot, Task, TaskLabel } from '../types';
import { button, el, field, icon, input, meter, select, textarea } from './dom';
import { LABEL_COLORS, normalizeLabels } from '../labels';
import { analyzeHabit } from '../habit-analysis';

export interface DashboardHost {
  notify(message: string): void;
  openFile(path: string): Promise<void>;
  dialog(title: string, render: (body: HTMLElement, close: () => void) => void): void;
  settings(): void;
  persistSettings?(): Promise<void>;
  setTasksOnly?(enabled: boolean): void;
}
const SCOPES: Record<Scope, string> = { day: 'День', week: 'Неделя', month: 'Месяц', year: 'Год' };
const REPEATS: Record<Recurrence, string> = { none: 'Без повтора', daily: 'Каждый день', weekdays: 'По будням', weekly: 'Раз в неделю', monthly: 'Раз в месяц' };
const PRIORITIES: Record<Priority, string> = { high: 'Высокий', normal: 'Обычный', low: 'Низкий' };
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const CAP = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export class Dashboard {
  private screen: Screen = 'day';
  private selected = dateKey();
  private calendarMonth = this.selected.slice(0, 7) + '-01';
  private data: Snapshot = { tasks: [], goals: [], habits: [], warnings: [] };
  private filter: 'all' | 'open' | 'done' = 'all';
  private query = '';
  private draft = '';
  private calendarOpen = false;
  private statsScope: Scope = 'week';
  private generation = 0;
  private disposed = false;
  constructor(private root: HTMLElement, private store: PlannerStore, private host: DashboardHost) { root.classList.add('dl-app'); }
  destroy(): void { this.disposed = true; this.generation++; this.root.replaceChildren(); }
  isTasksOnlyMode(): boolean { return this.root.classList.contains('dl-tasks-only'); }
  async refresh(): Promise<void> {
    const generation = ++this.generation;
    const snapshot = await this.store.snapshot();
    if (this.disposed || generation !== this.generation) return;
    this.data = snapshot; this.render();
  }
  navigate(screen: Screen, date = this.selected): void { this.screen = screen; this.selected = screen === 'week' ? weekStart(date) : date; this.calendarMonth = date.slice(0, 7) + '-01'; this.query = ''; this.filter = 'all'; this.render(); }
  private async action(operation: () => Promise<unknown>, message?: string): Promise<void> {
    try { await operation(); if (message) this.host.notify(message); await this.refresh(); }
    catch (error) { this.host.notify(error instanceof Error ? error.message : String(error)); this.render(); }
  }
  private render(): void {
    const active = document.activeElement as HTMLInputElement | null;
    const focused = active && this.root.contains(active) ? active.dataset.focus : undefined;
    const selection = focused && (active?.type === 'text' || active?.type === 'search') ? [active.selectionStart, active.selectionEnd] : undefined;
    this.root.replaceChildren();
    this.root.classList.toggle('dl-tasks-only', this.store.settings.tasksOnly && !['goals', 'habits', 'stats'].includes(this.screen));
    this.host.setTasksOnly?.(this.isTasksOnlyMode());
    const layout = el('div', 'dl-layout'); layout.append(this.sidebar(), this.main()); this.root.append(layout);
    if (this.root.classList.contains('dl-tasks-only')) this.root.append(button('Показать панели', () => this.togglePanels(), 'dl-button dl-focus-exit', 'focus'));
    if (focused) { const element = this.root.querySelector<HTMLInputElement>(`[data-focus="${focused}"]`); element?.focus(); if (selection) element?.setSelectionRange(selection[0] ?? 0, selection[1] ?? 0); }
  }
  private sidebar(): HTMLElement {
    const side = el('aside', 'dl-sidebar');
    const nav = el('nav', 'dl-nav'); nav.setAttribute('aria-label', 'Разделы планировщика');
    const items: [Screen, string, string][] = [['day', 'Мой день', 'sun'], ['week', 'Неделя', 'week'], ['month', 'Месяц', 'month'], ['year', 'Год', 'year'], ['goals', 'Цели', 'target'], ['habits', 'Привычки', 'leaf'], ['stats', 'Статистика', 'stats']];
    for (const [screen, label, glyph] of items) {
      const item = button(label, () => this.navigate(screen), `dl-nav-item ${this.screen === screen ? 'is-active' : ''}`, glyph);
      if (this.screen === screen) item.setAttribute('aria-current', 'page');
      nav.append(item);
    }
    side.append(nav, this.calendar());
    const footer = el('div', 'dl-sidebar-footer'); const caption = el('div', 'dl-local'); caption.append(icon('folder'), el('span', '', this.store.settings.root));
    const settings = button('Настройки', () => this.host.settings(), 'dl-settings-button', 'settings'); footer.append(caption, settings); side.append(footer); return side;
  }
  private calendar(): HTMLElement {
    const box = el('section', `dl-calendar ${this.calendarOpen ? 'is-open' : ''}`);
    const header = el('div', 'dl-calendar-header'); const controls = el('div', 'dl-inline');
    controls.append(button('Предыдущий месяц', () => { this.calendarMonth = stepPeriod(this.calendarMonth, 'month', -1); this.render(); }, 'dl-icon-button', 'left'), button('Следующий месяц', () => { this.calendarMonth = stepPeriod(this.calendarMonth, 'month', 1); this.render(); }, 'dl-icon-button', 'right'));
    header.append(el('strong', '', CAP(displayDate(this.calendarMonth, { month: 'long', year: 'numeric' }).replace(' г.', ''))), controls); box.append(header);
    const grid = el('div', 'dl-calendar-grid'); WEEKDAYS.forEach(d => grid.append(el('span', 'dl-calendar-weekday', d)));
    const first = weekDays(this.calendarMonth)[0]!; const busy = new Set(this.data.tasks.filter(t => t.status !== 'cancelled').map(t => t.scheduled));
    for (let i = 0; i < 42; i++) {
      const date = shiftDay(first, i); const node = button(String(parseDate(date).getDate()), () => this.navigate('day', date), `dl-calendar-day ${date.slice(0, 7) !== this.calendarMonth.slice(0, 7) ? 'is-outside' : ''} ${date === this.selected ? 'is-selected' : ''} ${date === dateKey() ? 'is-today' : ''} ${busy.has(date) ? 'has-tasks' : ''}`);
      node.setAttribute('aria-label', displayDate(date, { day: 'numeric', month: 'long', year: 'numeric' })); node.setAttribute('aria-pressed', String(date === this.selected)); if (date === dateKey()) node.setAttribute('aria-current', 'date'); grid.append(node);
    }
    box.append(grid); return box;
  }
  private main(): HTMLElement {
    const main = el('main', 'dl-main'); const top = el('div', 'dl-topbar');
    const crumb = el('div', 'dl-breadcrumb'); crumb.append(icon('calendar'), el('strong', '', this.screen === 'goals' ? 'Цели' : this.screen === 'habits' ? 'Привычки' : this.screen === 'stats' ? 'Статистика' : SCOPES[this.screen]));
    const topButtons = el('div', 'dl-inline'); topButtons.append(button('Календарь', () => { this.calendarOpen = !this.calendarOpen; this.render(); }, 'dl-icon-button dl-calendar-toggle', 'calendar'), button(this.screen === 'week' ? 'Текущая неделя' : this.screen === 'month' ? 'Текущий месяц' : this.screen === 'year' ? 'Текущий год' : 'Сегодня', () => this.navigate(['day', 'week', 'month', 'year'].includes(this.screen) ? this.screen : 'day', dateKey()), 'dl-button dl-button-quiet'));
    if (!['goals', 'habits', 'stats'].includes(this.screen)) topButtons.append(button('Только задачи', () => this.togglePanels(), 'dl-button dl-button-quiet', 'focus'));
    top.append(crumb, topButtons); main.append(top);
    const content = el('div', 'dl-content');
    if (this.data.warnings.length) { const warning = el('details', 'dl-warning'); warning.append(el('summary', '', `Не удалось прочитать файлов: ${this.data.warnings.length}`), el('pre', '', this.data.warnings.join('\n'))); content.append(warning); }
    if (this.screen === 'goals') content.append(this.goalsPage());
    else if (this.screen === 'habits') content.append(this.habitsPage());
    else if (this.screen === 'stats') content.append(this.statsPage());
    else content.append(this.plannerPage(this.screen));
    main.append(content); return main;
  }
  private pageHeader(eyebrow: string, title: string, subtitle: string, actions: HTMLElement[]): HTMLElement {
    const header = el('header', 'dl-page-header'); const text = el('div'); if (eyebrow) text.append(el('div', 'dl-eyebrow', eyebrow)); text.append(el('h1', '', title)); if (subtitle) text.append(el('p', 'dl-subtitle', subtitle)); const buttons = el('div', 'dl-header-actions'); buttons.append(...actions); header.append(text, buttons); return header;
  }
  private periodTasks(scope: Scope): Task[] {
    const ranks: Record<Scope, number> = { day: 0, week: 1, month: 2, year: 3 };
    return this.data.tasks.filter(t => t.status !== 'cancelled' && ranks[t.scope] <= ranks[scope] && (inPeriod(t.scheduled, scope, this.selected) || (scope === 'day' && this.selected === dateKey() && t.status === 'open' && t.scheduled < this.selected)));
  }
  private plannerPage(scope: Scope): HTMLElement {
    const page = el('div', 'dl-planner');
    const period = scope === 'day' ? displayDate(this.selected, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : scope === 'week' ? `${displayDate(weekDays(this.selected)[0]!)} — ${displayDate(weekDays(this.selected)[6]!, { day: 'numeric', month: 'long', year: 'numeric' })}` : scope === 'month' ? displayDate(this.selected, { month: 'long', year: 'numeric' }) : `${this.selected.slice(0, 4)} год`;
    const note = button('Заметка', () => { void this.action(async () => this.host.openFile(await this.store.ensureNote(scope, this.selected))); }, 'dl-button dl-button-secondary', 'file');
    const add = button('Новая задача', () => this.taskDialog(), 'dl-button dl-button-primary', 'plus');
    page.append(this.pageHeader('', CAP(period), '', [note, add]));
    const timeline = el('div', 'dl-period-navigation');
    timeline.append(button(scope === 'week' ? 'Предыдущая неделя' : 'Предыдущий период', () => this.navigate(scope, stepPeriod(this.selected, scope, -1)), 'dl-icon-button', 'left'));
    if (scope === 'day') {
      const days = el('div', 'dl-week-strip');
      for (const [i, date] of weekDays(this.selected).entries()) {
        const item = button(WEEKDAYS[i]!, () => this.navigate('day', date), `dl-week-day ${date === this.selected ? 'is-selected' : ''} ${date === dateKey() ? 'is-today' : ''}`);
        item.append(el('strong', '', String(parseDate(date).getDate())), el('i', this.data.tasks.some(t => t.scheduled === date && t.status === 'open') ? 'has-tasks' : ''));
        item.setAttribute('aria-label', displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' })); item.setAttribute('aria-pressed', String(date === this.selected)); days.append(item);
      }
      timeline.append(days);
    } else if (scope === 'week') {
      const weeks = el('div', 'dl-week-picker');
      for (const offset of [-1, 0, 1]) {
        const start = shiftDay(weekStart(this.selected), offset * 7); const end = shiftDay(start, 6);
        const choice = button(`Неделя ${periodKey('week', start).split('W')[1]}`, () => this.navigate('week', start), `dl-week-choice ${offset === 0 ? 'is-selected' : ''}`);
        choice.append(el('small', '', `${displayDate(start, { day: 'numeric', month: 'short' })} — ${displayDate(end, { day: 'numeric', month: 'short' })}`));
        choice.setAttribute('aria-label', `Неделя ${periodKey('week', start)}: ${displayDate(start)} — ${displayDate(end)}`); choice.setAttribute('aria-pressed', String(offset === 0)); weeks.append(choice);
      }
      timeline.append(weeks);
    } else timeline.append(el('strong', 'dl-period-label', CAP(period)));
    timeline.append(button(scope === 'week' ? 'Следующая неделя' : 'Следующий период', () => this.navigate(scope, stepPeriod(this.selected, scope, 1)), 'dl-icon-button', 'right')); page.append(timeline);
    const tasks = this.periodTasks(scope);
    const habits = this.data.habits.filter(h => !h.archived && habitDue(h.days, this.selected) && h.created <= this.selected);
    const columns = el('div', 'dl-columns'); const taskColumn = el('section', 'dl-task-panel');
    const taskHeader = el('div', 'dl-section-header'); const heading = el('div', 'dl-inline'); heading.append(el('h2', '', scope === 'day' ? 'Задачи дня' : 'Планы и задачи'));
    const search = input(this.query, 'search', 'Найти задачу'); search.dataset.focus = 'search'; search.setAttribute('aria-label', 'Найти задачу'); search.classList.add('dl-search'); search.oninput = () => { this.query = search.value; this.render(); };
    taskHeader.append(heading, search); taskColumn.append(taskHeader);
    const tabs = el('div', 'dl-tabs'); for (const [key, label] of [['all', 'Все'], ['open', 'В работе'], ['done', 'Готово']] as const) { const tab = button(label, () => { this.filter = key; this.render(); }, `dl-tab ${this.filter === key ? 'is-active' : ''}`); tab.setAttribute('aria-pressed', String(this.filter === key)); tabs.append(tab); } taskColumn.append(tabs, this.quickAdd());
    const visible = tasks.filter(t => (this.filter === 'all' ? this.store.settings.showCompleted || t.status === 'open' : t.status === this.filter) && `${t.title} ${t.description} ${t.labels.map(label => label.name).join(' ')}`.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
    const overdue = scope === 'day' ? this.data.tasks.filter(t => t.status === 'open' && t.scope === 'day' && t.scheduled < this.selected && this.selected <= dateKey()) : [];
    if (overdue.length && !this.query && this.filter !== 'done') {
      const banner = el('div', 'dl-overdue-banner'); banner.append(el('strong', '', `Незавершённые с прошлых дней · ${overdue.length}`), el('p', '', this.store.settings.autoRollover ? 'Задачи доступны ниже. Автоперенос на следующий день — в 12:00 по времени устройства.' : 'Автоперенос выключен. Дату можно изменить в форме задачи.')); taskColumn.append(banner);
    }
    if (!visible.length) taskColumn.append(this.empty(this.query ? 'Задачи не найдены' : 'Нет задач', this.query ? 'Измените поисковый запрос.' : 'Добавьте задачу в поле выше.'));
    else {
      const sorted = [...visible].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || ({ high: 0, normal: 1, low: 2 }[a.priority] - { high: 0, normal: 1, low: 2 }[b.priority]) || a.scheduled.localeCompare(b.scheduled));
      const list = el('div', 'dl-task-list'); list.setAttribute('aria-label', 'Задачи'); sorted.forEach(task => list.append(this.taskRow(task, scope !== 'day'))); taskColumn.append(list);
    }
    const rail = el('aside', 'dl-context-rail'); rail.append(scope === 'day' ? this.dailyHabits(habits) : this.habitAnalysis(scope));
    if (scope === 'day') rail.append(this.weekFocus()); else rail.append(this.goalPreview());
    columns.append(taskColumn, rail); page.append(columns); return page;
  }
  private quickAdd(): HTMLElement {
    const form = el('form', 'dl-quick-add'); const plus = icon('plus'); const title = input(this.draft, 'text', 'Добавить задачу'); title.dataset.focus = 'quick'; title.setAttribute('aria-label', 'Название новой задачи'); title.oninput = () => { this.draft = title.value; }; title.maxLength = 500;
    const submit = el('button', 'dl-quick-submit'); submit.type = 'submit'; submit.setAttribute('aria-label', 'Добавить задачу'); submit.append(icon('arrow')); form.append(plus, title, submit);
    form.onsubmit = async event => {
      event.preventDefault(); const value = title.value.trim(); if (!value || submit.disabled) return; submit.disabled = true;
      try { await this.store.createTask({ title: value, scheduled: this.selected, scope: this.taskScope() }); this.draft = ''; await this.refresh(); this.root.querySelector<HTMLInputElement>('[data-focus="quick"]')?.focus(); }
      catch (error) { this.host.notify(String(error)); submit.disabled = false; }
    }; return form;
  }
  private taskScope(): Scope { return ['day', 'week', 'month', 'year'].includes(this.screen) ? this.screen as Scope : 'day'; }
  private taskRow(task: Task, showDate: boolean): HTMLElement {
    const row = el('div', `dl-task-row ${task.status === 'done' ? 'is-done' : ''}`); const check = input('', 'checkbox'); check.className = 'dl-checkbox'; check.checked = task.status === 'done'; check.setAttribute('aria-label', `${task.status === 'done' ? 'Вернуть в работу' : 'Выполнить'}: ${task.title}`);
    check.onchange = () => { check.disabled = true; void this.action(() => this.store.setTaskStatus(task.path, check.checked ? 'done' : 'open')); };
    const body = el('div', 'dl-task-body'); body.append(button(task.title, () => this.taskDialog(task), 'dl-task-title'));
    const metadata = el('div', 'dl-task-meta');
    task.labels.forEach(label => metadata.append(el('span', `dl-label dl-label-${label.color}`, label.name)));
    if (task.priority === 'high') metadata.append(el('span', 'dl-tag dl-tag-priority', '↑ Высокий приоритет'));
    if (task.priority === 'low') metadata.append(el('span', 'dl-tag', '↓ Низкий приоритет'));
    const goal = this.data.goals.find(g => g.id === task.goal); if (goal) { const tag = el('span', 'dl-task-goal'); tag.append(icon('target'), el('span', '', goal.title)); metadata.append(tag); }
    if (task.recurrence !== 'none') { const repeat = el('span', 'dl-task-repeat'); repeat.append(icon('repeat'), el('span', '', REPEATS[task.recurrence])); metadata.append(repeat); }
    if (showDate || task.scheduled !== this.selected) metadata.append(el('span', '', `${displayDate(task.scheduled)}${task.scope !== 'day' ? ` · ${SCOPES[task.scope]}` : ''}`));
    if (task.due) metadata.append(el('span', task.due < dateKey() && task.status === 'open' ? 'dl-late' : '', `До ${displayDate(task.due)}`));
    const moved = task.history.filter(h => h.type === 'moved'); if (moved.length) metadata.append(el('span', 'dl-moved', `↪ с ${displayDate(moved[0]!.from ?? task.created)} · ${moved.length} перенос${moved.length === 1 ? '' : 'ов'}`));
    const checkTarget = el('label', 'dl-checkbox-target'); checkTarget.append(check);
    if (metadata.childElementCount) body.append(metadata); row.append(checkTarget, body);
    const menu = button('Действия с задачей', () => this.taskActions(task), 'dl-icon-button dl-row-menu', 'dots'); row.append(menu); return row;
  }
  private taskActions(task: Task): void {
    this.host.dialog('Действия с задачей', (body, close) => {
      body.append(el('p', 'dl-subtitle', task.title));
      const actions = el('div', 'dl-action-list');
      actions.append(button('Редактировать', () => { close(); this.taskDialog(task); }, 'dl-button', 'file'), button('Открыть Markdown', () => { close(); void this.action(() => this.host.openFile(task.path)); }, 'dl-button', 'file'), button('Отменить задачу', () => { close(); void this.action(() => this.store.setTaskStatus(task.path, 'cancelled'), 'Задача отменена. Файл и история сохранены.'); }, 'dl-button', 'close'), button('Удалить задачу', () => { close(); void this.action(() => this.store.deleteTask(task.path), 'Задача удалена. Файл перемещён в .trash.'); }, 'dl-button dl-danger', 'trash'));
      body.append(actions);
    });
  }
  private dailyHabits(habits: Habit[]): HTMLElement {
    const box = el('section', 'dl-card'); const header = el('div', 'dl-section-header'); header.append(el('h2', '', 'Привычки'), button('Все привычки', () => this.navigate('habits'), 'dl-icon-button', 'arrow')); box.append(header);
    if (!habits.length) box.append(button('Добавить привычку', () => this.habitDialog(), 'dl-add-habit', 'plus'));
    for (const habit of habits) { const done = habit.completions.includes(this.selected); const row = button(habit.title, () => { void this.action(() => this.store.toggleHabit(habit.path, this.selected)); }, `dl-habit-daily ${done ? 'is-done' : ''}`); const check = el('span', 'dl-habit-check'); if (done) check.append(icon('check')); row.prepend(check); row.disabled = this.selected > dateKey(); row.setAttribute('aria-pressed', String(done)); box.append(row); }
    return box;
  }
  private habitAnalysis(scope: Scope): HTMLElement {
    const box = el('section', 'dl-card dl-habit-analysis'); box.setAttribute('aria-label', 'Анализ привычек');
    box.append(el('h2', '', `Привычки · ${SCOPES[scope].toLocaleLowerCase()}`));
    const habits = this.data.habits.filter(h => !h.archived);
    if (!habits.length) box.append(el('p', 'dl-card-subtitle', 'Нет данных о привычках.'));
    for (const habit of habits) {
      const data = analyzeHabit(habit, scope, this.selected, dateKey());
      const row = el('div', 'dl-habit-analysis-row'); row.append(el('strong', '', habit.title));
      if (data.percent === null) row.append(el('p', '', 'За этот период пока нет запланированных дней.'));
      else { row.append(el('p', '', `${data.completed} из ${data.planned} · ${data.percent}%`), meter(data.percent), el('small', '', `Пропущено: ${data.missed}${data.pending ? ' · сегодня ещё не отмечено' : ''}`)); }
      box.append(row);
    }
    box.append(el('p', 'dl-card-subtitle', 'Учитываются дни по расписанию до сегодняшнего включительно. Будущие дни не считаются пропусками.'));
    return box;
  }
  private weekFocus(): HTMLElement {
    const box = el('section', 'dl-card dl-focus-card'); box.append(el('h2', '', 'Планы недели'));
    const tasks = this.data.tasks.filter(t => t.scope === 'week' && t.status === 'open' && inPeriod(t.scheduled, 'week', this.selected));
    if (tasks.length) tasks.slice(0, 3).forEach(t => box.append(button(t.title, () => this.taskDialog(t), 'dl-focus-task', 'target')));
    else box.append(el('p', '', 'Планов на неделю нет.'));
    box.append(button('К планам недели', () => this.navigate('week'), 'dl-text-button', 'arrow')); return box;
  }
  private goalPreview(): HTMLElement {
    const box = el('section', 'dl-card dl-focus-card'); box.append(el('h2', '', 'Цели'));
    const goals = this.data.goals.filter(g => g.status === 'active'); if (!goals.length) box.append(el('p', '', 'Активных целей нет.'));
    goals.slice(0, 3).forEach(g => box.append(button(g.title, () => this.goalDialog(g), 'dl-focus-task', 'target'))); box.append(button('Открыть цели', () => this.navigate('goals'), 'dl-text-button', 'arrow')); return box;
  }
  private empty(title: string, subtitle: string): HTMLElement {
    const box = el('div', 'dl-empty'); box.append(el('h3', '', title), el('p', '', subtitle)); return box;
  }
  private goalsPage(): HTMLElement {
    const page = el('div'); page.append(this.pageHeader('', 'Цели', '', [button('Новая цель', () => this.goalDialog(), 'dl-button dl-button-primary', 'plus')]));
    const goals = this.data.goals.filter(g => g.status !== 'archived');
    if (!goals.length) page.append(this.empty('Нет целей', 'Добавьте цель и свяжите с ней задачи.'));
    const grid = el('div', 'dl-goal-grid');
    for (const goal of goals) {
      const tasks = this.data.tasks.filter(t => t.goal === goal.id && t.status !== 'cancelled');
      const card = el('section', `dl-goal-card ${goal.status === 'done' ? 'is-done' : ''}`); const top = el('div', 'dl-section-header'); top.append(el('span', 'dl-goal-state', goal.status === 'done' ? 'Достигнута' : 'В работе'), button('Редактировать цель', () => this.goalDialog(goal), 'dl-icon-button', 'dots')); card.append(top, el('h2', '', goal.title));
      if (goal.description) card.append(el('p', 'dl-goal-description', goal.description));
      if (goal.target) card.append(el('p', `dl-goal-date ${goal.target < dateKey() && goal.status === 'active' ? 'dl-late' : ''}`, `Срок: ${displayDate(goal.target, { day: 'numeric', month: 'long', year: 'numeric' })}`));
      if (tasks.length) { const linked = el('details', 'dl-linked-tasks'); linked.append(el('summary', '', 'Связанные задачи')); tasks.forEach(task => linked.append(this.taskRow(task, true))); card.append(linked); }
      card.append(button('Добавить задачу', () => this.taskDialog(undefined, goal.id), 'dl-text-button', 'plus')); grid.append(card);
    }
    page.append(grid); return page;
  }
  private habitsPage(): HTMLElement {
    const page = el('div'); page.append(this.pageHeader('', 'Привычки', '', [button('Новая привычка', () => this.habitDialog(), 'dl-button dl-button-primary', 'plus')]));
    const nav = el('div', 'dl-habit-week-nav'); nav.append(button('Предыдущая неделя', () => { this.selected = shiftDay(this.selected, -7); this.render(); }, 'dl-icon-button', 'left'), el('strong', '', `${displayDate(weekDays(this.selected)[0]!)} — ${displayDate(weekDays(this.selected)[6]!)}`), button('Следующая неделя', () => { this.selected = shiftDay(this.selected, 7); this.render(); }, 'dl-icon-button', 'right')); page.append(nav);
    const habits = this.data.habits.filter(h => !h.archived); if (!habits.length) page.append(this.empty('Нет привычек', 'Добавьте привычку и выберите дни недели.'));
    const tableWrap = el('div', 'dl-habit-table-wrap'); const table = el('table', 'dl-habit-table'); const thead = el('thead'); const head = el('tr'); head.append(el('th', '', 'Привычка'));
    weekDays(this.selected).forEach((date, i) => { const th = el('th', date === dateKey() ? 'is-today' : ''); th.append(el('span', '', WEEKDAYS[i]), el('strong', '', String(parseDate(date).getDate()))); head.append(th); }); thead.append(head); table.append(thead);
    const tbody = el('tbody');
    for (const habit of habits) {
      const row = el('tr'); const label = el('td'); label.append(button(habit.title, () => this.habitDialog(habit), 'dl-habit-title')); row.append(label);
      for (const date of weekDays(this.selected)) {
        const cell = el('td'); const due = habitDue(habit.days, date) && habit.created <= date; const done = habit.completions.includes(date);
        const toggle = button(`${habit.title}, ${displayDate(date)}: ${done ? 'выполнено' : due ? 'не выполнено' : 'выходной'}`, () => { void this.action(() => this.store.toggleHabit(habit.path, date)); }, `dl-habit-cell ${done ? 'is-done' : ''} ${!due ? 'is-rest' : ''}`);
        toggle.replaceChildren(done ? icon('check') : el('span', '', due ? '' : '—')); toggle.disabled = !due || date > dateKey(); toggle.setAttribute('aria-pressed', String(done)); cell.append(toggle); row.append(cell);
      }
      tbody.append(row);
    }
    table.append(tbody); tableWrap.append(table); if (habits.length) page.append(tableWrap);
    return page;
  }
  private togglePanels(): void {
    this.store.settings.tasksOnly = !this.store.settings.tasksOnly;
    this.render();
    void this.host.persistSettings?.().catch(error => this.host.notify(String(error)));
  }
  private statsPage(): HTMLElement {
    const page = el('div', 'dl-statistics');
    page.append(this.pageHeader('', 'Статистика', '', []));
    const scope = select(SCOPES, this.statsScope); scope.setAttribute('aria-label', 'Период статистики');
    scope.onchange = () => { this.statsScope = scope.value as Scope; this.render(); };
    const controls = el('div', 'dl-stat-controls');
    controls.append(scope, button('Предыдущий период', () => { this.selected = stepPeriod(this.selected, this.statsScope, -1); this.render(); }, 'dl-icon-button', 'left'), input(this.selected, 'date'), button('Следующий период', () => { this.selected = stepPeriod(this.selected, this.statsScope, 1); this.render(); }, 'dl-icon-button', 'right'));
    const date = controls.querySelector('input')!; date.setAttribute('aria-label', 'Дата статистики'); date.onchange = () => { if (date.value) { this.selected = date.value; this.render(); } };
    page.append(controls, el('p', 'dl-subtitle', `Период: ${periodKey(this.statsScope, this.selected)}`));
    const inRange = (date: string) => !!date && inPeriod(date, this.statsScope, this.selected);
    const planned = this.data.tasks.filter(t => inRange(t.scheduled) && t.status !== 'cancelled');
    const completed = this.data.tasks.reduce((n, t) => n + (t.recurrence === 'none' ? Number(t.status === 'done' && inRange(t.completed)) : t.history.filter(h => h.type === 'completed' && inRange(h.date)).length), 0);
    const moved = this.data.tasks.reduce((n, t) => n + t.history.filter(h => h.type === 'moved' && inRange(h.date)).length, 0);
    const stats = el('div', 'dl-stats');
    for (const [label, value] of [['В работе', planned.filter(t => t.status === 'open').length], ['Выполнено за период', completed], ['Переносов', moved]] as const) {
      const stat = el('div', 'dl-stat'); stat.append(el('span', 'dl-stat-label', label), el('strong', 'dl-stat-value', String(value))); stats.append(stat);
    }
    page.append(stats);
    const goals = el('section', 'dl-card dl-stat-section'); goals.append(el('h2', '', 'Прогресс целей'));
    for (const goal of this.data.goals.filter(g => g.status !== 'archived')) {
      const tasks = this.data.tasks.filter(t => t.goal === goal.id && t.status !== 'cancelled');
      const done = tasks.filter(t => t.status === 'done').length;
      const row = el('div', 'dl-stat-row'); row.append(el('span', '', goal.title), el('span', '', `${done} из ${tasks.length}`), meter(goal.status === 'done' ? 100 : tasks.length ? done / tasks.length * 100 : 0)); goals.append(row);
    }
    if (goals.childElementCount === 1) goals.append(el('p', 'dl-subtitle', 'Нет целей.'));
    page.append(goals);
    const habits = this.data.habits.filter(h => !h.archived);
    const habitStats = el('section', 'dl-card dl-stat-section'); habitStats.append(el('h2', '', 'Привычки'));
    for (const habit of habits) {
      const row = el('div', 'dl-stat-row'); row.append(el('span', '', habit.title), el('span', '', `${habit.completions.filter(inRange).length} отметок · серия на сегодня: ${habitStreak(habit.days, habit.completions, dateKey(), habit.created)} дн.`)); habitStats.append(row);
    }
    if (!habits.length) habitStats.append(el('p', 'dl-subtitle', 'Нет привычек.'));
    page.append(habitStats);
    const history = el('section', 'dl-card dl-history'); history.append(el('h2', '', 'История за 12 недель'));
    const heatmap = el('div', 'dl-heatmap');
    for (let offset = -83; offset <= 0; offset++) {
      const date = shiftDay(dateKey(), offset); const available = habits.filter(h => h.created <= date && habitDue(h.days, date)); const n = available.filter(h => h.completions.includes(date)).length; const level = !available.length || !n ? 0 : n === available.length ? 3 : n / available.length >= .5 ? 2 : 1;
      const cell = button(`${displayDate(date)}: ${n} из ${available.length} привычек`, () => this.navigate('day', date), `dl-heat-cell dl-heat-${level}`); cell.replaceChildren(); cell.title = cell.getAttribute('aria-label')!; heatmap.append(cell);
    }
    history.append(heatmap); page.append(history);
    page.append(el('p', 'dl-subtitle', 'Сводка задач и отметок — за выбранный период. Прогресс целей — за всё время. История привычек — за последние 12 недель. Даты выполнения задач, отмеченных вручную в Markdown, могут быть неточными.'));
    return page;
  }
  taskDialog(task?: Task, goalId?: string): void {
    this.host.dialog(task ? 'Редактировать задачу' : 'Новая задача', (body, close) => {
      const form = el('form', 'dl-form'); const title = input(task?.title ?? this.draft, 'text', 'Например, набросать план проекта'); title.required = true; title.maxLength = 500;
      const scheduled = input(task?.scheduled ?? this.selected, 'date'); scheduled.required = true;
      const scope = select(SCOPES, task?.scope ?? this.taskScope()); const priority = select(PRIORITIES, task?.priority ?? 'normal'); const repeat = select(REPEATS, task?.recurrence ?? 'none');
      const goals: Record<string, string> = { '': 'Без привязки к цели' }; this.data.goals.filter(g => g.status !== 'archived' || g.id === task?.goal).forEach(g => { goals[g.id] = g.title; });
      const goal = select(goals, task?.goal ?? goalId ?? ''); const due = input(task?.due ?? '', 'date'); const notes = textarea(task?.description ?? '', 'Описание и ссылки. Поддерживается Markdown.');
      const grid = el('div', 'dl-form-grid'); grid.append(field('Дата плана', scheduled), field('Горизонт', scope), field('Приоритет', priority), field('Повторение', repeat), field('Срок (необязательно)', due), field('Цель', goal)); const labels = (task?.labels ?? []).map(label => ({ ...label })); const labelEditor = this.labelsEditor(labels);
      form.append(field('Задача', title), grid, labelEditor.element, field('Заметки', notes));
      if (task?.recurrence !== 'none' || !task) form.append(el('p', 'dl-form-hint', 'При выполнении повторяющаяся задача запишет результат и получит следующую дату. Повтор доступен только для задач дня.'));
      if (task?.history.length) { const history = el('details', 'dl-occurrences'); history.append(el('summary', '', 'История задачи')); task.history.slice().reverse().forEach(h => history.append(el('p', '', `${h.at ? new Date(h.at).toLocaleString('ru-RU') : displayDate(h.date)} · ${h.type === 'moved' ? `перенос с ${h.from ?? '—'} на ${h.to ?? '—'}${h.automatic ? ' · автоматически' : ''}` : h.type === 'completed' ? 'выполнена' : h.type === 'cancelled' ? 'отменена' : 'возвращена в работу'}`))); form.append(history); }
      this.formActions(form, close, async () => {
        if (repeat.value !== 'none' && scope.value !== 'day') throw new Error('Повторяющиеся задачи должны иметь горизонт «День»');
        labelEditor.commit();
        const values = { title: title.value, scheduled: scheduled.value, scope: scope.value as Scope, priority: priority.value as Priority, recurrence: repeat.value as Recurrence, goal: goal.value, labels, due: due.value, description: notes.value };
        if (task) await this.store.updateTask(task.path, values); else { await this.store.createTask(values); this.draft = ''; }
      }, task ? 'Сохранить' : 'Добавить задачу', task ? button('Markdown', () => { close(); void this.action(() => this.host.openFile(task.path)); }, 'dl-button dl-button-secondary', 'file') : undefined);
      body.append(form); window.setTimeout(() => title.focus(), 20);
    });
  }
  private labelsEditor(labels: TaskLabel[]): { element: HTMLElement; commit: () => void } {
    const group = el('section', 'dl-label-editor'); group.setAttribute('aria-label', 'Метки задачи');
    group.append(el('div', 'dl-field-label', 'Метки'));
    const chips = el('div', 'dl-label-chips');
    const render = () => { chips.replaceChildren(); labels.forEach((label, index) => chips.append(button(`${label.name} ×`, () => { labels.splice(index, 1); render(); }, `dl-label dl-label-${label.color}`))); };
    const name = input('', 'text', 'Название метки'); name.maxLength = 60; name.setAttribute('aria-label', 'Название метки');
    const color = select(LABEL_COLORS, 'blue'); color.setAttribute('aria-label', 'Цвет метки');
    const add = () => { const normalized = normalizeLabels([...labels, { name: name.value, color: color.value as LabelColor }]); labels.splice(0, labels.length, ...normalized); name.value = ''; render(); };
    name.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); add(); } };
    const controls = el('div', 'dl-label-controls'); controls.append(name, color, button('Добавить метку', add, 'dl-button dl-button-secondary', 'plus'));
    group.append(chips, controls);
    const suggestions = el('div', 'dl-label-chips'); const seen = new Set<string>();
    for (const label of this.data.tasks.flatMap(task => task.labels)) {
      if (seen.has(label.name)) continue; seen.add(label.name);
      suggestions.append(button(label.name, () => { if (!labels.some(l => l.name.toLocaleLowerCase() === label.name.toLocaleLowerCase())) labels.push({ ...label }); render(); }, `dl-label dl-label-${label.color}`));
    }
    if (suggestions.childElementCount) { group.append(el('span', 'dl-form-hint', 'Использованные ранее'), suggestions); }
    // Commit a typed label on save even if its add button was not pressed.
    group.addEventListener('focusout', event => { if (!group.contains(event.relatedTarget as Node | null) && name.value.trim()) add(); });
    render(); return { element: group, commit: add };
  }
  private goalDialog(goal?: Goal): void {
    this.host.dialog(goal ? 'Редактировать цель' : 'Новая цель', (body, close) => {
      const form = el('form', 'dl-form'); const title = input(goal?.title ?? '', 'text', 'Например, пробежать первые 10 км'); title.required = true;
      const target = input(goal?.target ?? '', 'date'); const status = select({ active: 'В работе', done: 'Достигнута', archived: 'В архиве' }, goal?.status ?? 'active'); const notes = textarea(goal?.description ?? '', 'Описание цели и критерии выполнения.');
      form.append(field('Цель', title), field('Срок', target)); if (goal) form.append(field('Состояние', status)); form.append(field('Описание', notes), el('p', 'dl-form-hint', 'Прогресс рассчитывается по выполненным связанным задачам. Достижение цели можно отметить вручную.'));
      const extras = el('div', 'dl-inline');
      if (goal) {
        extras.append(button('Markdown', () => { close(); void this.action(() => this.host.openFile(goal.path)); }, 'dl-button dl-button-secondary', 'file'), button('Удалить цель', () => { close(); void this.action(() => this.store.deleteGoal(goal.path), 'Цель перемещена в .trash. Связанные задачи сохранены.'); }, 'dl-button dl-danger', 'trash'));
        form.append(el('p', 'dl-form-hint', 'Удаление перемещает файл цели в .trash. Связанные задачи остаются; после восстановления цели из корзины связи вернутся.'));
      }
      this.formActions(form, close, () => this.store.saveGoal({ path: goal?.path, title: title.value, target: target.value, description: notes.value, status: status.value as Goal['status'] }), 'Сохранить цель', goal ? extras : undefined); body.append(form);
    });
  }
  private habitDialog(habit?: Habit): void {
    this.host.dialog(habit ? 'Редактировать привычку' : 'Новая привычка', (body, close) => {
      const form = el('form', 'dl-form'); const title = input(habit?.title ?? '', 'text', 'Например, 20 минут чтения'); title.required = true; const notes = textarea(habit?.description ?? '', 'Описание привычки.');
      const days = new Set(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]); const choices = el('div', 'dl-day-choices');
      WEEKDAYS.forEach((name, i) => { const day = (i + 1) % 7; const toggle = button(name, () => { if (days.has(day)) days.delete(day); else days.add(day); toggle.classList.toggle('is-active', days.has(day)); toggle.setAttribute('aria-pressed', String(days.has(day))); }, `dl-day-choice ${days.has(day) ? 'is-active' : ''}`); toggle.setAttribute('aria-pressed', String(days.has(day))); choices.append(toggle); });
      form.append(field('Привычка', title), field('В какие дни?', choices), field('Заметки', notes));
      const extras = el('div', 'dl-inline');
      if (habit) extras.append(button('В архив', () => { close(); void this.action(() => this.store.saveHabit({ ...habit, archived: true }), 'Привычка в архиве. История сохранена в Markdown.'); }, 'dl-button dl-button-quiet'), button('Удалить привычку', () => { close(); void this.action(() => this.store.deleteHabit(habit.path), 'Привычка и её отметки перемещены в .trash.'); }, 'dl-button dl-danger', 'trash'));
      if (habit) form.append(button('Открыть Markdown', () => { close(); void this.action(() => this.host.openFile(habit.path)); }, 'dl-text-button', 'file'));
      this.formActions(form, close, () => this.store.saveHabit({ path: habit?.path, title: title.value, days: [...days], description: notes.value }), 'Сохранить привычку', habit ? extras : undefined); body.append(form);
    });
  }
  private formActions(form: HTMLFormElement, close: () => void, save: () => Promise<unknown>, label: string, extra?: HTMLElement): void {
    const error = el('p', 'dl-form-error'); error.setAttribute('role', 'alert'); const actions = el('div', 'dl-form-actions'); const submit = el('button', 'dl-button dl-button-primary', label); submit.type = 'submit';
    if (extra) actions.append(extra); actions.append(button('Отмена', close, 'dl-button dl-button-secondary'), submit); form.append(error, actions);
    form.onsubmit = async event => { event.preventDefault(); if (submit.disabled) return; submit.disabled = true; error.textContent = ''; try { await save(); close(); await this.refresh(); } catch (e) { error.textContent = e instanceof Error ? e.message : String(e); submit.disabled = false; } };
  }
}
