import { App, ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, parseYaml, stringifyYaml } from 'obsidian';
import { dateKey } from './dates';
import { ObsidianStorage } from './obsidian-storage';
import { PlannerStore, normalizeRoot } from './store';
import { DEFAULT_SETTINGS, type Settings } from './types';
import { Dashboard, type DashboardHost } from './ui/dashboard';
import { button, el } from './ui/dom';
import { PLUGIN_ID, PLUGIN_NAME } from './identity';

const VIEW = `${PLUGIN_ID}-planner`;
class PlannerModal extends Modal {
  constructor(app: App, private title: string, private render: (body: HTMLElement, close: () => void) => void) { super(app); }
  onOpen(): void { this.titleEl.setText(this.title); this.modalEl.addClass('dl-modal'); this.contentEl.addClass('dl-dialog'); this.render(this.contentEl, () => this.close()); }
  onClose(): void { this.contentEl.empty(); }
}
class PlannerView extends ItemView {
  dashboard?: Dashboard;
  constructor(leaf: WorkspaceLeaf, private plugin: SmartTodoPlugin) { super(leaf); }
  getViewType(): string { return VIEW; }
  getDisplayText(): string { return PLUGIN_NAME; }
  getIcon(): string { return 'sun'; }
  async onOpen(): Promise<void> {
    this.contentEl.empty(); this.contentEl.addClass('dl-view');
    this.dashboard = new Dashboard(this.contentEl, this.plugin.store, this.plugin.host());
    await this.dashboard.refresh();
  }
  async onClose(): Promise<void> { this.plugin.setTasksOnly(false); this.dashboard?.destroy(); this.dashboard = undefined; }
}

export default class SmartTodoPlugin extends Plugin {
  declare settings: Settings;
  store!: PlannerStore;
  private refreshTimer?: number;
  private lastDay = '';
  private unloaded = false;
  private savedPanels?: { left: boolean; right: boolean };
  setTasksOnly(enabled: boolean): void {
    const { leftSplit, rightSplit } = this.app.workspace;
    if (enabled && !this.unloaded) {
      this.savedPanels ??= { left: leftSplit.collapsed, right: rightSplit.collapsed };
      if (!leftSplit.collapsed) leftSplit.collapse();
      if (!rightSplit.collapsed) rightSplit.collapse();
    } else if (this.savedPanels) {
      const previous = this.savedPanels; this.savedPanels = undefined;
      if (!previous.left) leftSplit.expand();
      if (!previous.right) rightSplit.expand();
    }
  }
  async onload(): Promise<void> {
    const saved = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
    this.settings.showCompleted = typeof this.settings.showCompleted === 'boolean' ? this.settings.showCompleted : true;
    this.settings.tasksOnly = this.settings.tasksOnly === true;
    try { this.settings.root = normalizeRoot(this.settings.root); }
    catch { this.settings.root = DEFAULT_SETTINGS.root; new Notice('Smart Todo: некорректная папка в настройках. Используется _todotracking.'); }
    this.store = new PlannerStore(new ObsidianStorage(this.app), { parse: parseYaml, stringify: stringifyYaml }, this.settings);
    this.registerView(VIEW, leaf => new PlannerView(leaf, this));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.setTasksOnly(this.app.workspace.getActiveViewOfType(PlannerView)?.dashboard?.isTasksOnlyMode() === true)));
    this.addRibbonIcon('sun', 'Открыть Smart Todo', () => { void this.openPlanner(); });
    this.addCommand({ id: 'open-planner', name: 'Открыть планировщик', callback: () => { void this.openPlanner(); } });
    this.addCommand({ id: 'add-task', name: 'Добавить задачу', callback: () => { void this.openPlanner(true); } });
    this.addCommand({ id: 'open-today', name: 'Открыть заметку на сегодня', callback: () => { void this.openNote(); } });
    this.addCommand({ id: 'collect-checkboxes', name: 'Собрать незавершённые задачи из открытой заметки', callback: () => { void this.collectFromActiveNote(); } });
    this.addSettingTab(new PlannerSettings(this.app, this));
    const changed = (file: { path: string }) => { if (file.path.startsWith(`${this.settings.root}/`)) this.scheduleRefresh(); };
    this.registerEvent(this.app.vault.on('create', changed));
    this.registerEvent(this.app.vault.on('modify', changed));
    this.registerEvent(this.app.vault.on('delete', changed));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => { if (file.path.startsWith(`${this.settings.root}/`) || oldPath.startsWith(`${this.settings.root}/`)) this.scheduleRefresh(); }));
    this.registerDomEvent(document, 'visibilitychange', () => { if (!document.hidden) { this.checkDay(); } });
    this.registerDomEvent(window, 'focus', () => { this.checkDay(); });
    this.registerInterval(window.setInterval(() => { this.checkDay(); }, 60_000));
    this.app.workspace.onLayoutReady(() => { if (!this.unloaded) { this.checkDay(); } });
  }
  onunload(): void { this.unloaded = true; this.setTasksOnly(false); if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer); }
  private report(error: unknown): void { console.error('Smart Todo', error); new Notice(`Smart Todo: ${error instanceof Error ? error.message : String(error)}`, 8000); }
  private checkDay(): void {
    const today = dateKey();
    if (!this.unloaded && this.lastDay !== today) { this.lastDay = today; this.scheduleRefresh(); }
  }
  scheduleRefresh(): void {
    if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PlannerView) void leaf.view.dashboard?.refresh().catch(error => this.report(error));
    }, 180);
  }
  host(): DashboardHost {
    return {
      notify: message => { new Notice(message); },
      openFile: async path => { const file = this.app.vault.getAbstractFileByPath(path); if (file instanceof TFile) await this.app.workspace.getLeaf('tab').openFile(file); else throw new Error(`Файл не найден: ${path}`); },
      dialog: (title, render) => { new PlannerModal(this.app, title, render).open(); },
      persistSettings: () => this.saveSettings(),
      setTasksOnly: enabled => { if (this.app.workspace.getActiveViewOfType(PlannerView)) this.setTasksOnly(enabled); },
      settings: () => {
        // Open the public plugin-specific settings through a modal; no private app.setting API.
        new PlannerModal(this.app, 'Настройки', body => { new PlannerSettings(this.app, this).renderInto(body); }).open();
      },
    };
  }
  async openPlanner(addTask = false): Promise<void> {
    try {
      let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
      if (!leaf) { leaf = this.app.workspace.getLeaf('tab'); await leaf.setViewState({ type: VIEW, active: true }); }
      await this.app.workspace.revealLeaf(leaf);
      if (leaf.view instanceof PlannerView) {
        await leaf.view.dashboard?.refresh(); leaf.view.dashboard?.navigate('day', dateKey());
        if (addTask) leaf.view.dashboard?.taskDialog();
      }
    } catch (error) { this.report(error); }
  }
  private async openNote(): Promise<void> { try { await this.host().openFile(await this.store.ensureNote('day', dateKey())); } catch (error) { this.report(error); } }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); this.scheduleRefresh(); }
  private async collectFromActiveNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== 'md') { new Notice('Сначала откройте Markdown-заметку с задачами.'); return; }
    if (file.path.startsWith(`${this.settings.root}/tasks/`)) { new Notice('Эта задача уже находится в Smart Todo.'); return; }
    try {
      const text = await this.app.vault.read(file);
      const { legacyTasks } = await import('./legacy'); const candidates = legacyTasks(text);
      if (!candidates.length) { new Notice('В заметке нет незавершённых Markdown-задач.'); return; }
      new PlannerModal(this.app, `Добавить в Smart Todo · ${candidates.length}`, (body, close) => {
        body.append(el('p', '', `Источник: ${file.path}. Задачи будут скопированы в план на сегодня. Исходная заметка останется без изменений. Повторный импорт той же строки не создаёт копий.`));
        const list = el('ul', 'dl-import-list'); candidates.forEach(c => list.append(el('li', '', c.title))); body.append(list);
        const save = button('Добавить задачи', () => {
          save.disabled = true;
          void this.importTasks(file, text).then(n => { close(); new Notice(`Smart Todo: добавлено задач — ${n}`); this.scheduleRefresh(); }).catch(error => { save.disabled = false; this.report(error); });
        }, 'dl-button dl-button-primary', 'plus'); body.append(save);
      }).open();
    } catch (error) { this.report(error); }
  }
  private async importTasks(file: TFile, text: string): Promise<number> {
    const { importLegacy } = await import('./legacy'); return importLegacy(this.store, file.path, text, dateKey());
  }
}

class PlannerSettings extends PluginSettingTab {
  constructor(app: App, private plugin: SmartTodoPlugin) { super(app, plugin); }
  display(): void { this.containerEl.empty(); this.renderInto(this.containerEl); }
  renderInto(container: HTMLElement): void {
    let root = this.plugin.settings.root;
    new Setting(container).setName('Папка планировщика').setDesc('При сохранении все файлы Smart Todo переедут в новую папку с обновлением ссылок. Совпадения имён отменяют перенос.').addText(text => text.setValue(root).setPlaceholder('_todotracking').onChange(value => { root = value; })).addButton(btn => btn.setButtonText('Сохранить папку').onClick(async () => {
      btn.setDisabled(true);
      const previousRoot = this.plugin.settings.root;
      try {
        await this.plugin.store.moveRoot(root);
        try { await this.plugin.saveSettings(); }
        catch (error) {
          await this.plugin.store.moveRoot(previousRoot);
          throw new Error(`Не удалось сохранить настройки. Файлы возвращены в ${previousRoot}. ${error instanceof Error ? error.message : String(error)}`);
        }
        new Notice(`Smart Todo: папка ${this.plugin.settings.root}`);
      }
      catch (error) { new Notice(error instanceof Error ? error.message : String(error), 9000); }
      finally { btn.setDisabled(false); }
    }));
    new Setting(container).setName('Показывать выполненные').setDesc('В разделе «Все». Вкладка «Готово» доступна всегда.').addToggle(toggle => toggle.setValue(this.plugin.settings.showCompleted).onChange(async value => { this.plugin.settings.showCompleted = value; await this.plugin.saveSettings(); }));
    container.append(el('p', 'dl-settings-help', 'Корзина .trash находится в корне хранилища. Удалённые задачи, цели и привычки перемещаются туда. Smart Todo не очищает корзину автоматически; файлы остаются до ручного удаления. Для восстановления верните файл в исходную папку tasks, goals или habits.'));
    const help = el('div', 'dl-settings-help'); help.append(el('h3', '', 'Если хотите оставить Calendar'), el('p', '', 'В Daily notes укажите папку ниже и формат YYYY-MM-DD. В настройках Calendar задайте папку недель и формат GGGG-[W]WW. Тогда оба календаря будут открывать одни и те же заметки.'));
    const paths = el('pre', '', `Дни: ${this.plugin.settings.root}/days\nНедели: ${this.plugin.settings.root}/weeks`); help.append(paths, el('p', '', 'Calendar по-прежнему создаёт заметки по своим правилам. В календаре Smart Todo просмотр дня не создаёт файлов. Старые заметки можно переместить в эти папки через файловый проводник Obsidian — ссылки обновятся штатно.'), el('h3', '', 'Задачи из существующих заметок'), el('p', '', 'Откройте заметку и выполните команду «Smart Todo: Собрать незавершённые задачи из открытой заметки». Появится список для просмотра перед добавлением.'));
    container.append(help);
  }
}
