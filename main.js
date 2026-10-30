"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/ids.ts
function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function importId(key) {
  const bytes = new TextEncoder().encode(key);
  return "import-" + [2166136261, 2722868949, 2654435769, 2246822507].map((seed, index) => {
    let hash = seed;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619 + index * 2);
      hash ^= hash >>> 13;
    }
    hash = Math.imul(hash ^ hash >>> 16, 2246822507);
    return ((hash ^ hash >>> 16) >>> 0).toString(16).padStart(8, "0");
  }).join("");
}
var init_ids = __esm({
  "src/ids.ts"() {
    "use strict";
  }
});

// manifest.json
var manifest_default;
var init_manifest = __esm({
  "manifest.json"() {
    manifest_default = {
      id: "smart-todo-vlad-9c82e1b4",
      name: "Smart Todo",
      version: "1.0.1",
      minAppVersion: "1.8.0",
      description: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C, \u0437\u0430\u0434\u0430\u0447\u0438 \u0441 \u0430\u0432\u0442\u043E\u043F\u0435\u0440\u0435\u043D\u043E\u0441\u043E\u043C, \u043F\u043B\u0430\u043D\u044B, \u0446\u0435\u043B\u0438 \u0438 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \u0432 \u043E\u0431\u044B\u0447\u043D\u044B\u0445 Markdown-\u0444\u0430\u0439\u043B\u0430\u0445.",
      author: "Personal build for Vlad",
      isDesktopOnly: false
    };
  }
});

// src/identity.ts
function entityType(kind) {
  return `smart-todo-${kind}`;
}
function matchesEntityType(value, kind) {
  return value === entityType(kind) || value === `dayline-${kind}`;
}
var PLUGIN_ID, PLUGIN_NAME;
var init_identity = __esm({
  "src/identity.ts"() {
    "use strict";
    init_manifest();
    PLUGIN_ID = manifest_default.id;
    PLUGIN_NAME = manifest_default.name;
  }
});

// src/legacy.ts
var legacy_exports = {};
__export(legacy_exports, {
  importLegacy: () => importLegacy,
  legacyTasks: () => legacyTasks
});
function legacyTasks(text) {
  const result = [];
  let fence = "";
  let frontmatter = false;
  text.split(/\r?\n/).forEach((line, i) => {
    var _a;
    if (i === 0 && line.trim() === "---") {
      frontmatter = true;
      return;
    }
    if (frontmatter) {
      if (line.trim() === "---") frontmatter = false;
      return;
    }
    const marker = (_a = /^\s{0,3}(`{3,}|~{3,})/.exec(line)) == null ? void 0 : _a[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = "";
      return;
    }
    if (fence) return;
    const match = /^\s*[-*+] \[ \] (.+)$/.exec(line);
    if (match && !/<!-- (?:smart-todo|dayline):task -->/.test(match[1])) result.push({ title: match[1].trim(), line: i + 1 });
  });
  return result;
}
async function importLegacy(store, source, text, today) {
  let count = 0;
  const candidates = legacyTasks(text);
  for (const item of candidates) {
    const duplicateIndex = candidates.filter((t) => t.title === item.title && t.line < item.line).length;
    const importKey = JSON.stringify([source, item.title, duplicateIndex]);
    const id = importId(importKey);
    const path = `${store.settings.root}/tasks/${id}.md`;
    if (await store.storage.exists(path)) {
      const existing = await store.storage.read(path);
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(existing);
      if (frontmatter && store.codec.parse(frontmatter[1]).importKey === importKey) continue;
      throw new Error(`\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442 \u0438\u043C\u043F\u043E\u0440\u0442\u0430: ${path}. \u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u0444\u0430\u0439\u043B \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.`);
    }
    const data = { type: entityType("task"), id, title: item.title, status: "open", scheduled: today, scope: "day", priority: "normal", recurrence: "none", goal: "", due: "", created: today, completed: "", history: [], source, importKey };
    const sourceLink = source.replace(/\.md$/, "");
    const body = `- [ ] ${item.title} <!-- smart-todo:task -->

\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: [[${sourceLink}]] (\u0441\u0442\u0440\u043E\u043A\u0430 ${item.line}).
`;
    await store.storage.create(path, `---
${store.codec.stringify(data).trim()}
---
${body}`);
    count++;
  }
  return count;
}
var init_legacy = __esm({
  "src/legacy.ts"() {
    "use strict";
    init_ids();
    init_identity();
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SmartTodoPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/dates.ts
function dateKey(date = /* @__PURE__ */ new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function nextNoon(now) {
  const next = new Date(now);
  next.setHours(12, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}
function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0434\u0430\u0442\u0430: ${value}`);
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  if (dateKey(date) !== value) throw new Error(`\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0434\u0430\u0442\u0430: ${value}`);
  return date;
}
function validDate(value) {
  if (typeof value !== "string") return false;
  try {
    parseDate(value);
    return true;
  } catch (e) {
    return false;
  }
}
function shiftDay(value, offset) {
  const date = parseDate(value);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}
function weekStart(value) {
  return shiftDay(value, -((parseDate(value).getDay() + 6) % 7));
}
function weekDays(value) {
  return Array.from({ length: 7 }, (_, i) => shiftDay(weekStart(value), i));
}
function isoWeek(value) {
  const local = parseDate(value);
  const date = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const n = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 864e5 + 1) / 7);
  return `${year}-W${String(n).padStart(2, "0")}`;
}
function periodKey(scope, value) {
  return scope === "day" ? value : scope === "week" ? isoWeek(value) : scope === "month" ? value.slice(0, 7) : value.slice(0, 4);
}
function inPeriod(date, scope, selected) {
  return periodKey(scope, date) === periodKey(scope, selected);
}
function periodBounds(scope, selected) {
  if (scope === "day") return { start: selected, end: selected };
  if (scope === "week") return { start: weekStart(selected), end: shiftDay(weekStart(selected), 6) };
  const start = scope === "month" ? selected.slice(0, 7) + "-01" : selected.slice(0, 4) + "-01-01";
  return { start, end: shiftDay(stepPeriod(start, scope, 1), -1) };
}
function stepPeriod(value, scope, offset) {
  if (scope === "day" || scope === "week") return shiftDay(value, offset * (scope === "week" ? 7 : 1));
  const date = parseDate(value);
  date.setDate(1);
  if (scope === "month") date.setMonth(date.getMonth() + offset);
  else date.setFullYear(date.getFullYear() + offset);
  return dateKey(date);
}
function nextOccurrence(value, recurrence) {
  if (recurrence === "monthly") {
    const date = parseDate(value);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
    return dateKey(date);
  }
  let next = shiftDay(value, recurrence === "weekly" ? 7 : 1);
  while (recurrence === "weekdays" && [0, 6].includes(parseDate(next).getDay())) next = shiftDay(next, 1);
  return next;
}
function displayDate(value, options = { day: "numeric", month: "long" }) {
  return parseDate(value).toLocaleDateString("ru-RU", options);
}
function habitDue(days, value) {
  return days.includes(parseDate(value).getDay());
}
function habitStreak(days, completions, today, created) {
  if (!days.length) return 0;
  const set = new Set(completions);
  let count = 0;
  let cursor = today;
  if (!set.has(cursor)) cursor = shiftDay(cursor, -1);
  const earliest = completions.reduce((min, date) => date < min ? date : min, created);
  while (cursor >= earliest) {
    if (habitDue(days, cursor)) {
      if (!set.has(cursor)) break;
      count++;
    }
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

// src/obsidian-storage.ts
var import_obsidian = require("obsidian");
var ObsidianStorage = class {
  constructor(app) {
    this.app = app;
  }
  list() {
    return this.app.vault.getFiles().map((f) => f.path);
  }
  file(path) {
    const file = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(path));
    if (!(file instanceof import_obsidian.TFile)) throw new Error(`\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${path}`);
    return file;
  }
  read(path) {
    return this.app.vault.read(this.file(path));
  }
  exists(path) {
    return this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(path)) !== null;
  }
  async parents(path) {
    const pieces = (0, import_obsidian.normalizePath)(path).split("/");
    pieces.pop();
    let parent = "";
    for (const piece of pieces) {
      parent = parent ? `${parent}/${piece}` : piece;
      const existing = this.app.vault.getAbstractFileByPath(parent);
      if (existing && !(existing instanceof import_obsidian.TFolder)) throw new Error(`\u0412\u043C\u0435\u0441\u0442\u043E \u043F\u0430\u043F\u043A\u0438 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442 \u0444\u0430\u0439\u043B: ${parent}`);
      if (!existing) {
        try {
          await this.app.vault.createFolder(parent);
        } catch (error) {
          if (!(this.app.vault.getAbstractFileByPath(parent) instanceof import_obsidian.TFolder)) throw error;
        }
      }
    }
  }
  async create(path, content) {
    await this.parents(path);
    await this.app.vault.create((0, import_obsidian.normalizePath)(path), content);
  }
  async process(path, update) {
    await this.app.vault.process(this.file(path), update);
  }
  async move(from, to) {
    await this.parents(to);
    await this.app.fileManager.renameFile(this.file(from), (0, import_obsidian.normalizePath)(to));
  }
  async trash(path) {
    await this.app.vault.trash(this.file(path), false);
  }
};

// src/store.ts
init_ids();

// src/labels.ts
var LABEL_COLORS = { gray: "\u0421\u0435\u0440\u044B\u0439", red: "\u041A\u0440\u0430\u0441\u043D\u044B\u0439", orange: "\u041E\u0440\u0430\u043D\u0436\u0435\u0432\u044B\u0439", green: "\u0417\u0435\u043B\u0451\u043D\u044B\u0439", blue: "\u0421\u0438\u043D\u0438\u0439", purple: "\u0424\u0438\u043E\u043B\u0435\u0442\u043E\u0432\u044B\u0439" };
function normalizeLabels(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  const labels = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.name !== "string") continue;
    const name = item.name.replace(/[\r\n]+/g, " ").trim().slice(0, 60);
    if (!name || seen.has(name.toLocaleLowerCase())) continue;
    seen.add(name.toLocaleLowerCase());
    labels.push({ name, color: Object.hasOwn(LABEL_COLORS, item.color) ? item.color : "gray" });
  }
  return labels;
}

// src/store.ts
init_identity();
var TASK_LINE = /^- \[([ xX-])\] (.*?) <!-- (?:smart-todo|dayline):task -->[ \t]*$/m;
var str = (v, fallback = "") => typeof v === "string" ? v : fallback;
var pick = (v, options, fallback) => options.includes(v) ? v : fallback;
var singleLine = (value) => value.replace(/[\r\n]+/g, " ").trim();
function normalizeRoot(input2) {
  const value = input2.trim().replace(/\\/g, "/").replace(/\/+$/g, "");
  if (!value || value.startsWith("/") || /[:*?"<>|\x00-\x1f]/.test(value) || value.split("/").some((p) => !p || p === "." || p === ".." || p.startsWith("."))) {
    throw new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u0432\u043D\u0443\u0442\u0440\u0438 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 _todotracking. \u0421\u043A\u0440\u044B\u0442\u044B\u0435 \u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u043F\u0430\u043F\u043A\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.");
  }
  return value;
}
var PlannerStore = class {
  constructor(storage, codec, settings, now = () => dateKey(), clock = () => /* @__PURE__ */ new Date()) {
    this.storage = storage;
    this.codec = codec;
    this.settings = settings;
    this.now = now;
    this.clock = clock;
    __publicField(this, "queue", Promise.resolve());
    settings.root = normalizeRoot(settings.root);
  }
  serial(action) {
    const next = this.queue.then(action, action);
    this.queue = next.catch(() => {
    });
    return next;
  }
  decode(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!match) throw new Error("\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 Markdown");
    const data = this.codec.parse(match[1]);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 Markdown");
    if (typeof data.id !== "string" || !data.id) throw new Error("\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 id");
    return { data, body: text.slice(match[0].length) };
  }
  encode(doc) {
    return `---
${this.codec.stringify(doc.data).trim()}
---
${doc.body}`;
  }
  task(doc, path) {
    var _a, _b, _c;
    const d = doc.data;
    if (!validDate(d.scheduled)) throw new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0434\u0430\u0442\u0430 \u0437\u0430\u0434\u0430\u0447\u0438");
    const line = TASK_LINE.exec(doc.body);
    const status = line ? line[1].toLowerCase() === "x" ? "done" : line[1] === "-" ? "cancelled" : "open" : pick(d.status, ["open", "done", "cancelled"], "open");
    const history = Array.isArray(d.history) ? d.history.filter((h) => !!h && typeof h === "object" && validDate(h.date) && ["moved", "completed", "reopened", "cancelled"].includes(h.type)) : [];
    return {
      id: str(d.id),
      path,
      title: (_a = line == null ? void 0 : line[2]) != null ? _a : str(d.title, "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"),
      status,
      scheduled: d.scheduled,
      initialScheduled: validDate(d.initialScheduled) ? d.initialScheduled : (_c = (_b = history.find((h) => h.type === "moved" && validDate(h.from))) == null ? void 0 : _b.from) != null ? _c : d.scheduled,
      scope: pick(d.scope, ["day", "week", "month", "year"], "day"),
      priority: pick(d.priority, ["normal", "high", "low"], "normal"),
      recurrence: pick(d.recurrence, ["none", "daily", "weekdays", "weekly", "monthly"], "none"),
      goal: str(d.goal),
      labels: normalizeLabels(d.labels),
      due: validDate(d.due) ? d.due : "",
      created: validDate(d.created) ? d.created : d.scheduled,
      completed: status === "done" ? validDate(d.completed) ? d.completed : d.scheduled : "",
      history,
      description: doc.body.replace(TASK_LINE, "").trim()
    };
  }
  goal(doc, path) {
    return { id: str(doc.data.id), path, title: str(doc.data.title, "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"), target: validDate(doc.data.target) ? doc.data.target : "", status: pick(doc.data.status, ["active", "done", "archived"], "active"), description: doc.body.trim() };
  }
  habit(doc, path) {
    const d = doc.data;
    return { id: str(d.id), path, title: str(d.title, "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"), days: Array.isArray(d.days) ? [...new Set(d.days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))] : [0, 1, 2, 3, 4, 5, 6], completions: Array.isArray(d.completions) ? [...new Set(d.completions.filter(validDate))].sort() : [], created: validDate(d.created) ? d.created : this.now(), archived: d.archived === true, description: doc.body.trim() };
  }
  async snapshot() {
    await this.queue;
    const result = { tasks: [], goals: [], habits: [], warnings: [] };
    const root = this.settings.root;
    const paths2 = (await this.storage.list()).filter((p) => p.startsWith(`${root}/`) && p.endsWith(".md"));
    await Promise.all(paths2.map(async (path) => {
      const relative = path.slice(root.length + 1);
      if (!/^(tasks|goals|habits)\/[^/]+\.md$/.test(relative)) return;
      try {
        const doc = this.decode(await this.storage.read(path));
        if (matchesEntityType(doc.data.type, "task")) result.tasks.push(this.task(doc, path));
        else if (matchesEntityType(doc.data.type, "goal")) result.goals.push(this.goal(doc, path));
        else if (matchesEntityType(doc.data.type, "habit")) result.habits.push(this.habit(doc, path));
      } catch (error) {
        result.warnings.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }));
    result.tasks.sort((a, b) => a.scheduled.localeCompare(b.scheduled) || a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
    result.goals.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    result.habits.sort((a, b) => a.created.localeCompare(b.created) || a.title.localeCompare(b.title, "ru"));
    return result;
  }
  async createTask(input2) {
    const title = singleLine(input2.title);
    if (!title) throw new Error("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438");
    if (!validDate(input2.scheduled) || input2.due && !validDate(input2.due)) throw new Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u0442\u0443");
    return this.serial(async () => {
      var _a, _b, _c, _d, _e, _f, _g;
      const id = newId();
      const path = `${this.settings.root}/tasks/${id}.md`;
      const data = { type: entityType("task"), id, title, status: "open", scheduled: input2.scheduled, initialScheduled: input2.scheduled, scope: (_a = input2.scope) != null ? _a : "day", priority: (_b = input2.priority) != null ? _b : "normal", recurrence: (_c = input2.recurrence) != null ? _c : "none", goal: (_d = input2.goal) != null ? _d : "", labels: normalizeLabels(input2.labels), due: (_e = input2.due) != null ? _e : "", created: this.now(), completed: "", history: [] };
      await this.storage.create(path, this.encode({ data, body: `- [ ] ${title} <!-- smart-todo:task -->

${(_g = (_f = input2.description) == null ? void 0 : _f.trim()) != null ? _g : ""}
` }));
      return path;
    });
  }
  async mutateTask(path, update) {
    await this.storage.process(path, (text) => {
      const doc = this.decode(text);
      const current = this.task(doc, path);
      const patch = update(current);
      if (patch.labels !== void 0) patch.labels = normalizeLabels(patch.labels);
      if (!Object.keys(patch).length) return text;
      const next = { ...current, ...patch };
      if (!singleLine(next.title) || !validDate(next.scheduled) || next.due && !validDate(next.due)) throw new Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0434\u0430\u0442\u044B");
      for (const [key, value] of Object.entries(patch)) if (!["path", "id", "description"].includes(key)) doc.data[key] = value;
      doc.data.title = singleLine(next.title);
      doc.data.status = next.status;
      doc.data.initialScheduled = current.initialScheduled;
      const checkbox = `- [${next.status === "done" ? "x" : next.status === "cancelled" ? "-" : " "}] ${singleLine(next.title)} <!-- smart-todo:task -->`;
      if (patch.description !== void 0) doc.body = `${checkbox}

${patch.description.trim()}
`;
      else if (TASK_LINE.test(doc.body)) doc.body = doc.body.replace(TASK_LINE, () => checkbox);
      else doc.body = `${checkbox}

${doc.body}`;
      return this.encode(doc);
    });
  }
  updateTask(path, patch) {
    return this.serial(() => this.mutateTask(path, (task) => ({ ...patch, ...patch.scheduled && patch.scheduled !== task.scheduled ? { history: [...task.history, { type: "moved", date: this.now(), from: task.scheduled, to: patch.scheduled, at: this.clock().toISOString(), automatic: false }] } : {} })));
  }
  setTaskStatus(path, status) {
    return this.serial(() => this.mutateTask(path, (task) => {
      if (task.status === status) return {};
      const today = this.now();
      if (status === "done" && task.recurrence !== "none") {
        if (task.scheduled > today || task.history.some((h) => h.type === "completed" && h.date === today)) return {};
        return { scheduled: nextOccurrence(today > task.scheduled ? today : task.scheduled, task.recurrence), status: "open", completed: "", history: [...task.history, { type: "completed", date: today, from: task.scheduled, at: this.clock().toISOString() }] };
      }
      return { status, completed: status === "done" ? today : "", history: [...task.history, { type: status === "done" ? "completed" : status === "cancelled" ? "cancelled" : "reopened", date: today, at: this.clock().toISOString() }] };
    }));
  }
  deleteTask(path) {
    return this.deleteEntity(path, "tasks", "task");
  }
  deleteGoal(path) {
    return this.deleteEntity(path, "goals", "goal");
  }
  deleteHabit(path) {
    return this.deleteEntity(path, "habits", "habit");
  }
  deleteEntity(path, folder, type) {
    return this.serial(async () => {
      const prefix = `${this.settings.root}/${folder}/`;
      if (!path.startsWith(prefix) || !/^[^/\\]+\.md$/.test(path.slice(prefix.length)) || path.slice(prefix.length).startsWith(".")) throw new Error("\u0424\u0430\u0439\u043B \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u043D\u0435 \u043F\u0430\u043F\u043A\u0438 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0442\u0438\u043F\u0430 Smart Todo");
      const doc = this.decode(await this.storage.read(path));
      if (!matchesEntityType(doc.data.type, type)) throw new Error("\u0422\u0438\u043F \u0444\u0430\u0439\u043B\u0430 \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044E");
      await this.storage.trash(path);
    });
  }
  async rollover() {
    if (!this.settings.autoRollover) return 0;
    const snapshot = await this.snapshot();
    const today = this.now();
    const instant = this.clock();
    const cutoffDay = instant.getHours() < 12 ? shiftDay(today, -1) : today;
    let count = 0;
    await this.serial(async () => {
      for (const task of snapshot.tasks) {
        let target = cutoffDay;
        if (task.recurrence === "weekdays") while (!habitDue([1, 2, 3, 4, 5], target)) target = shiftDay(target, -1);
        if (task.status !== "open" || task.scope !== "day" || task.scheduled >= target) continue;
        if (!await this.storage.exists(task.path)) continue;
        await this.mutateTask(task.path, (current) => {
          if (current.status !== "open" || current.scope !== "day" || current.scheduled >= target || current.recurrence !== task.recurrence) return {};
          const effective = parseDate(target);
          effective.setHours(12, 0, 0, 0);
          count++;
          return { scheduled: target, history: [...current.history, { type: "moved", date: today, from: current.scheduled, to: target, at: instant.toISOString(), effectiveAt: effective.toISOString(), automatic: true }] };
        });
      }
    });
    return count;
  }
  saveGoal(input2) {
    if (!singleLine(input2.title) || input2.target && !validDate(input2.target)) return Promise.reject(new Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0434\u0430\u0442\u0443 \u0446\u0435\u043B\u0438"));
    return this.serial(async () => {
      if (input2.path) await this.storage.process(input2.path, (text) => {
        var _a;
        const doc = this.decode(text);
        Object.assign(doc.data, { title: singleLine(input2.title), target: input2.target, status: (_a = input2.status) != null ? _a : doc.data.status });
        doc.body = `${input2.description.trim()}
`;
        return this.encode(doc);
      });
      else {
        const id = newId();
        await this.storage.create(`${this.settings.root}/goals/${id}.md`, this.encode({ data: { type: entityType("goal"), id, title: singleLine(input2.title), target: input2.target, status: "active" }, body: `${input2.description.trim()}
` }));
      }
    });
  }
  saveHabit(input2) {
    if (!singleLine(input2.title) || !input2.days.length || input2.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return Promise.reject(new Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u0438\u043D \u0434\u0435\u043D\u044C \u043D\u0435\u0434\u0435\u043B\u0438"));
    return this.serial(async () => {
      if (input2.path) await this.storage.process(input2.path, (text) => {
        var _a;
        const doc = this.decode(text);
        Object.assign(doc.data, { title: singleLine(input2.title), days: [...new Set(input2.days)], archived: (_a = input2.archived) != null ? _a : doc.data.archived });
        doc.body = `${input2.description.trim()}
`;
        return this.encode(doc);
      });
      else {
        const id = newId();
        await this.storage.create(`${this.settings.root}/habits/${id}.md`, this.encode({ data: { type: entityType("habit"), id, title: singleLine(input2.title), days: [...new Set(input2.days)], completions: [], created: this.now(), archived: false }, body: `${input2.description.trim()}
` }));
      }
    });
  }
  toggleHabit(path, date) {
    if (!validDate(date) || date > this.now()) return Promise.reject(new Error("\u0411\u0443\u0434\u0443\u0449\u0438\u0435 \u0434\u043D\u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u043C\u0438"));
    return this.serial(() => this.storage.process(path, (text) => {
      const doc = this.decode(text);
      const habit = this.habit(doc, path);
      if (!habitDue(habit.days, date) || date < habit.created) throw new Error("\u0412 \u044D\u0442\u043E\u0442 \u0434\u0435\u043D\u044C \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0430 \u043D\u0435 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0430");
      const dates = new Set(habit.completions);
      if (dates.has(date)) dates.delete(date);
      else dates.add(date);
      doc.data.completions = [...dates].sort();
      return this.encode(doc);
    }));
  }
  notePath(scope, date) {
    const folder = { day: "days", week: "weeks", month: "months", year: "years" }[scope];
    return `${this.settings.root}/${folder}/${periodKey(scope, date)}.md`;
  }
  async ensureNote(scope, date) {
    const path = this.notePath(scope, date);
    return this.serial(async () => {
      if (!await this.storage.exists(path)) {
        const title = { day: "\u0414\u0435\u043D\u044C", week: "\u041D\u0435\u0434\u0435\u043B\u044F", month: "\u041C\u0435\u0441\u044F\u0446", year: "\u0413\u043E\u0434" }[scope];
        await this.storage.create(path, `---
type: smart-todo-${scope}
period: "${periodKey(scope, date)}"
---

# ${title} \xB7 ${periodKey(scope, date)}

## \u0424\u043E\u043A\u0443\u0441


## \u0417\u0430\u043C\u0435\u0442\u043A\u0438


## \u0418\u0442\u043E\u0433\u0438

`);
      }
      return path;
    });
  }
  async moveRoot(input2) {
    const root = normalizeRoot(input2);
    const old = this.settings.root;
    if (root === old) return;
    if (root.startsWith(`${old}/`) || old.startsWith(`${root}/`)) throw new Error("\u041D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0432\u043B\u043E\u0436\u0435\u043D\u0430 \u0432 \u0441\u0442\u0430\u0440\u0443\u044E \u0438\u043B\u0438 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u0435\u0451");
    await this.serial(async () => {
      const paths2 = (await this.storage.list()).filter((p) => p.startsWith(`${old}/`));
      const moves = paths2.map((from) => ({ from, to: root + from.slice(old.length) }));
      for (const { to } of moves) if (await this.storage.exists(to)) throw new Error(`\u0424\u0430\u0439\u043B \u0443\u0436\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442: ${to}. \u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043E\u0442\u043C\u0435\u043D\u0451\u043D.`);
      const moved = [];
      try {
        for (const move of moves) {
          await this.storage.move(move.from, move.to);
          moved.push(move);
        }
      } catch (error) {
        const failures = [];
        for (const move of moved.reverse()) try {
          await this.storage.move(move.to, move.from);
        } catch (e) {
          failures.push(move.to);
        }
        if (failures.length) throw new Error(`\u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043F\u0440\u0435\u0440\u0432\u0430\u043D. \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0444\u0430\u0439\u043B\u044B: ${failures.join(", ")}. \u0418\u0441\u0445\u043E\u0434\u043D\u0430\u044F \u043F\u0430\u043F\u043A\u0430: ${old}; \u043D\u043E\u0432\u0430\u044F: ${root}.`);
        throw error;
      }
      this.settings.root = root;
    });
  }
};

// src/types.ts
var DEFAULT_SETTINGS = { root: "_todotracking", autoRollover: true, showCompleted: true, tasksOnly: false };

// src/ui/dom.ts
function el(tag, className = "", text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== void 0) node.textContent = text;
  return node;
}
function button(label, onClick, className = "", iconName) {
  const node = el("button", className);
  node.type = "button";
  node.setAttribute("aria-label", label);
  if (iconName) node.append(icon(iconName));
  node.append(el("span", "", label));
  node.onclick = onClick;
  return node;
}
var paths = {
  stats: "M4 20V10h4v10M10 20V4h4v16m2 0V8h4v12M2 20h20",
  focus: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  sun: "M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
  week: "M4 4h16v16H4zM4 9h16M9 9v11M15 9v11",
  month: "M4 4h16v16H4zM4 9h16M8 13h1m3 0h1m3 0h1M8 17h1m3 0h1m3 0h1",
  year: "M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z",
  target: "M21 12a9 9 0 1 1-9-9m5 0v4h4m-4 0-5 5m4 0a4 4 0 1 1-4-4",
  leaf: "M20 3C9 2 3 7 5 15c2 7 13 6 15-12ZM4 21l10-10",
  plus: "M12 5v14M5 12h14",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  check: "m5 12 4 4L19 6",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  file: "M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8m-8 4h6",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  repeat: "m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3",
  move: "M5 5h14v14H5zM8 12h8m-3-3 3 3-3 3",
  close: "m6 6 12 12M6 18 18 6",
  sparkle: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  folder: "M3 7V4h6l2 3h10v13H3Z"
};
function icon(name) {
  var _a;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", (_a = paths[name]) != null ? _a : paths.sun);
  svg.append(path);
  return svg;
}
function field(label, input2) {
  const wrap = el("label", "dl-field");
  wrap.append(el("span", "dl-field-label", label), input2);
  return wrap;
}
function input(value = "", type = "text", placeholder = "") {
  const node = el("input", "dl-input");
  node.type = type;
  node.value = value;
  node.placeholder = placeholder;
  return node;
}
function select(options, value) {
  const node = el("select", "dl-input");
  for (const [key, label] of Object.entries(options)) {
    const option = el("option", "", label);
    option.value = key;
    node.append(option);
  }
  node.value = value;
  return node;
}
function textarea(value, placeholder = "") {
  const node = el("textarea", "dl-input");
  node.value = value;
  node.rows = 4;
  node.placeholder = placeholder;
  return node;
}
function meter(value, className = "") {
  const node = el("div", `dl-meter ${className}`);
  node.setAttribute("role", "progressbar");
  node.setAttribute("aria-label", "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E");
  node.setAttribute("aria-valuenow", String(Math.round(value)));
  node.setAttribute("aria-valuemin", "0");
  node.setAttribute("aria-valuemax", "100");
  const fill = el("span");
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  node.append(fill);
  return node;
}

// src/habit-analysis.ts
function analyzeHabit(habit, scope, selected, today) {
  const { start, end } = periodBounds(scope, selected);
  const last = end < today ? end : today;
  const completions = new Set(habit.completions);
  let completed = 0;
  let planned = 0;
  let missed = 0;
  let pending = 0;
  for (let date = start > habit.created ? start : habit.created; date <= last; date = shiftDay(date, 1)) {
    if (!habitDue(habit.days, date)) continue;
    planned++;
    if (completions.has(date)) completed++;
    else if (date < today) missed++;
    else pending++;
  }
  return { completed, planned, missed, pending, percent: planned ? Math.round(completed / planned * 100) : null };
}

// src/ui/dashboard.ts
var SCOPES = { day: "\u0414\u0435\u043D\u044C", week: "\u041D\u0435\u0434\u0435\u043B\u044F", month: "\u041C\u0435\u0441\u044F\u0446", year: "\u0413\u043E\u0434" };
var REPEATS = { none: "\u0411\u0435\u0437 \u043F\u043E\u0432\u0442\u043E\u0440\u0430", daily: "\u041A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C", weekdays: "\u041F\u043E \u0431\u0443\u0434\u043D\u044F\u043C", weekly: "\u0420\u0430\u0437 \u0432 \u043D\u0435\u0434\u0435\u043B\u044E", monthly: "\u0420\u0430\u0437 \u0432 \u043C\u0435\u0441\u044F\u0446" };
var PRIORITIES = { high: "\u0412\u044B\u0441\u043E\u043A\u0438\u0439", normal: "\u041E\u0431\u044B\u0447\u043D\u044B\u0439", low: "\u041D\u0438\u0437\u043A\u0438\u0439" };
var WEEKDAYS = ["\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431", "\u0412\u0441"];
var CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);
var Dashboard = class {
  constructor(root, store, host) {
    this.root = root;
    this.store = store;
    this.host = host;
    __publicField(this, "screen", "day");
    __publicField(this, "selected", dateKey());
    __publicField(this, "calendarMonth", this.selected.slice(0, 7) + "-01");
    __publicField(this, "data", { tasks: [], goals: [], habits: [], warnings: [] });
    __publicField(this, "filter", "all");
    __publicField(this, "query", "");
    __publicField(this, "draft", "");
    __publicField(this, "calendarOpen", false);
    __publicField(this, "statsScope", "week");
    __publicField(this, "generation", 0);
    __publicField(this, "disposed", false);
    root.classList.add("dl-app");
  }
  destroy() {
    this.disposed = true;
    this.generation++;
    this.root.replaceChildren();
  }
  isTasksOnlyMode() {
    return this.root.classList.contains("dl-tasks-only");
  }
  async refresh() {
    const generation = ++this.generation;
    const snapshot = await this.store.snapshot();
    if (this.disposed || generation !== this.generation) return;
    this.data = snapshot;
    this.render();
  }
  navigate(screen, date = this.selected) {
    this.screen = screen;
    this.selected = screen === "week" ? weekStart(date) : date;
    this.calendarMonth = date.slice(0, 7) + "-01";
    this.query = "";
    this.filter = "all";
    this.render();
  }
  async action(operation, message) {
    try {
      await operation();
      if (message) this.host.notify(message);
      await this.refresh();
    } catch (error) {
      this.host.notify(error instanceof Error ? error.message : String(error));
      this.render();
    }
  }
  render() {
    var _a, _b, _c, _d;
    const active = document.activeElement;
    const focused = active && this.root.contains(active) ? active.dataset.focus : void 0;
    const selection = focused && ((active == null ? void 0 : active.type) === "text" || (active == null ? void 0 : active.type) === "search") ? [active.selectionStart, active.selectionEnd] : void 0;
    this.root.replaceChildren();
    this.root.classList.toggle("dl-tasks-only", this.store.settings.tasksOnly && !["goals", "habits", "stats"].includes(this.screen));
    (_b = (_a = this.host).setTasksOnly) == null ? void 0 : _b.call(_a, this.isTasksOnlyMode());
    const layout = el("div", "dl-layout");
    layout.append(this.sidebar(), this.main());
    this.root.append(layout);
    if (this.root.classList.contains("dl-tasks-only")) this.root.append(button("\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u0438", () => this.togglePanels(), "dl-button dl-focus-exit", "focus"));
    if (focused) {
      const element = this.root.querySelector(`[data-focus="${focused}"]`);
      element == null ? void 0 : element.focus();
      if (selection) element == null ? void 0 : element.setSelectionRange((_c = selection[0]) != null ? _c : 0, (_d = selection[1]) != null ? _d : 0);
    }
  }
  sidebar() {
    const side = el("aside", "dl-sidebar");
    const nav = el("nav", "dl-nav");
    nav.setAttribute("aria-label", "\u0420\u0430\u0437\u0434\u0435\u043B\u044B \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430");
    const items = [["day", "\u041C\u043E\u0439 \u0434\u0435\u043D\u044C", "sun"], ["week", "\u041D\u0435\u0434\u0435\u043B\u044F", "week"], ["month", "\u041C\u0435\u0441\u044F\u0446", "month"], ["year", "\u0413\u043E\u0434", "year"], ["goals", "\u0426\u0435\u043B\u0438", "target"], ["habits", "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438", "leaf"], ["stats", "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", "stats"]];
    for (const [screen, label, glyph] of items) {
      const item = button(label, () => this.navigate(screen), `dl-nav-item ${this.screen === screen ? "is-active" : ""}`, glyph);
      if (this.screen === screen) item.setAttribute("aria-current", "page");
      nav.append(item);
    }
    side.append(nav, this.calendar());
    const footer = el("div", "dl-sidebar-footer");
    const caption = el("div", "dl-local");
    caption.append(icon("folder"), el("span", "", this.store.settings.root));
    const settings = button("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", () => this.host.settings(), "dl-settings-button", "settings");
    footer.append(caption, settings);
    side.append(footer);
    return side;
  }
  calendar() {
    const box = el("section", `dl-calendar ${this.calendarOpen ? "is-open" : ""}`);
    const header = el("div", "dl-calendar-header");
    const controls = el("div", "dl-inline");
    controls.append(button("\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446", () => {
      this.calendarMonth = stepPeriod(this.calendarMonth, "month", -1);
      this.render();
    }, "dl-icon-button", "left"), button("\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446", () => {
      this.calendarMonth = stepPeriod(this.calendarMonth, "month", 1);
      this.render();
    }, "dl-icon-button", "right"));
    header.append(el("strong", "", CAP(displayDate(this.calendarMonth, { month: "long", year: "numeric" }).replace(" \u0433.", ""))), controls);
    box.append(header);
    const grid = el("div", "dl-calendar-grid");
    WEEKDAYS.forEach((d) => grid.append(el("span", "dl-calendar-weekday", d)));
    const first = weekDays(this.calendarMonth)[0];
    const busy = new Set(this.data.tasks.filter((t) => t.status !== "cancelled").map((t) => t.scheduled));
    for (let i = 0; i < 42; i++) {
      const date = shiftDay(first, i);
      const node = button(String(parseDate(date).getDate()), () => this.navigate("day", date), `dl-calendar-day ${date.slice(0, 7) !== this.calendarMonth.slice(0, 7) ? "is-outside" : ""} ${date === this.selected ? "is-selected" : ""} ${date === dateKey() ? "is-today" : ""} ${busy.has(date) ? "has-tasks" : ""}`);
      node.setAttribute("aria-label", displayDate(date, { day: "numeric", month: "long", year: "numeric" }));
      node.setAttribute("aria-pressed", String(date === this.selected));
      if (date === dateKey()) node.setAttribute("aria-current", "date");
      grid.append(node);
    }
    box.append(grid);
    return box;
  }
  main() {
    const main = el("main", "dl-main");
    const top = el("div", "dl-topbar");
    const crumb = el("div", "dl-breadcrumb");
    crumb.append(icon("calendar"), el("strong", "", this.screen === "goals" ? "\u0426\u0435\u043B\u0438" : this.screen === "habits" ? "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438" : this.screen === "stats" ? "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430" : SCOPES[this.screen]));
    const topButtons = el("div", "dl-inline");
    topButtons.append(button("\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C", () => {
      this.calendarOpen = !this.calendarOpen;
      this.render();
    }, "dl-icon-button dl-calendar-toggle", "calendar"), button(this.screen === "week" ? "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F" : this.screen === "month" ? "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043C\u0435\u0441\u044F\u0446" : this.screen === "year" ? "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0433\u043E\u0434" : "\u0421\u0435\u0433\u043E\u0434\u043D\u044F", () => this.navigate(["day", "week", "month", "year"].includes(this.screen) ? this.screen : "day", dateKey()), "dl-button dl-button-quiet"));
    if (!["goals", "habits", "stats"].includes(this.screen)) topButtons.append(button("\u0422\u043E\u043B\u044C\u043A\u043E \u0437\u0430\u0434\u0430\u0447\u0438", () => this.togglePanels(), "dl-button dl-button-quiet", "focus"));
    top.append(crumb, topButtons);
    main.append(top);
    const content = el("div", "dl-content");
    if (this.data.warnings.length) {
      const warning = el("details", "dl-warning");
      warning.append(el("summary", "", `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u0432: ${this.data.warnings.length}`), el("pre", "", this.data.warnings.join("\n")));
      content.append(warning);
    }
    if (this.screen === "goals") content.append(this.goalsPage());
    else if (this.screen === "habits") content.append(this.habitsPage());
    else if (this.screen === "stats") content.append(this.statsPage());
    else content.append(this.plannerPage(this.screen));
    main.append(content);
    return main;
  }
  pageHeader(eyebrow, title, subtitle, actions) {
    const header = el("header", "dl-page-header");
    const text = el("div");
    if (eyebrow) text.append(el("div", "dl-eyebrow", eyebrow));
    text.append(el("h1", "", title));
    if (subtitle) text.append(el("p", "dl-subtitle", subtitle));
    const buttons = el("div", "dl-header-actions");
    buttons.append(...actions);
    header.append(text, buttons);
    return header;
  }
  periodTasks(scope) {
    const ranks = { day: 0, week: 1, month: 2, year: 3 };
    return this.data.tasks.filter((t) => t.status !== "cancelled" && ranks[t.scope] <= ranks[scope] && (inPeriod(t.scheduled, scope, this.selected) || scope === "day" && this.selected === dateKey() && t.status === "open" && t.scheduled < this.selected));
  }
  plannerPage(scope) {
    const page = el("div", "dl-planner");
    const period = scope === "day" ? displayDate(this.selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : scope === "week" ? `${displayDate(weekDays(this.selected)[0])} \u2014 ${displayDate(weekDays(this.selected)[6], { day: "numeric", month: "long", year: "numeric" })}` : scope === "month" ? displayDate(this.selected, { month: "long", year: "numeric" }) : `${this.selected.slice(0, 4)} \u0433\u043E\u0434`;
    const note = button("\u0417\u0430\u043C\u0435\u0442\u043A\u0430", () => {
      void this.action(async () => this.host.openFile(await this.store.ensureNote(scope, this.selected)));
    }, "dl-button dl-button-secondary", "file");
    const add = button("\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430", () => this.taskDialog(), "dl-button dl-button-primary", "plus");
    page.append(this.pageHeader("", CAP(period), "", [note, add]));
    const timeline = el("div", "dl-period-navigation");
    timeline.append(button(scope === "week" ? "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F" : "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", () => this.navigate(scope, stepPeriod(this.selected, scope, -1)), "dl-icon-button", "left"));
    if (scope === "day") {
      const days = el("div", "dl-week-strip");
      for (const [i, date] of weekDays(this.selected).entries()) {
        const item = button(WEEKDAYS[i], () => this.navigate("day", date), `dl-week-day ${date === this.selected ? "is-selected" : ""} ${date === dateKey() ? "is-today" : ""}`);
        item.append(el("strong", "", String(parseDate(date).getDate())), el("i", this.data.tasks.some((t) => t.scheduled === date && t.status === "open") ? "has-tasks" : ""));
        item.setAttribute("aria-label", displayDate(date, { weekday: "long", day: "numeric", month: "long" }));
        item.setAttribute("aria-pressed", String(date === this.selected));
        days.append(item);
      }
      timeline.append(days);
    } else if (scope === "week") {
      const weeks = el("div", "dl-week-picker");
      for (const offset of [-1, 0, 1]) {
        const start = shiftDay(weekStart(this.selected), offset * 7);
        const end = shiftDay(start, 6);
        const choice = button(`\u041D\u0435\u0434\u0435\u043B\u044F ${periodKey("week", start).split("W")[1]}`, () => this.navigate("week", start), `dl-week-choice ${offset === 0 ? "is-selected" : ""}`);
        choice.append(el("small", "", `${displayDate(start, { day: "numeric", month: "short" })} \u2014 ${displayDate(end, { day: "numeric", month: "short" })}`));
        choice.setAttribute("aria-label", `\u041D\u0435\u0434\u0435\u043B\u044F ${periodKey("week", start)}: ${displayDate(start)} \u2014 ${displayDate(end)}`);
        choice.setAttribute("aria-pressed", String(offset === 0));
        weeks.append(choice);
      }
      timeline.append(weeks);
    } else timeline.append(el("strong", "dl-period-label", CAP(period)));
    timeline.append(button(scope === "week" ? "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F" : "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", () => this.navigate(scope, stepPeriod(this.selected, scope, 1)), "dl-icon-button", "right"));
    page.append(timeline);
    const tasks = this.periodTasks(scope);
    const habits = this.data.habits.filter((h) => !h.archived && habitDue(h.days, this.selected) && h.created <= this.selected);
    const columns = el("div", "dl-columns");
    const taskColumn = el("section", "dl-task-panel");
    const taskHeader = el("div", "dl-section-header");
    const heading = el("div", "dl-inline");
    heading.append(el("h2", "", scope === "day" ? "\u0417\u0430\u0434\u0430\u0447\u0438 \u0434\u043D\u044F" : "\u041F\u043B\u0430\u043D\u044B \u0438 \u0437\u0430\u0434\u0430\u0447\u0438"));
    const search = input(this.query, "search", "\u041D\u0430\u0439\u0442\u0438 \u0437\u0430\u0434\u0430\u0447\u0443");
    search.dataset.focus = "search";
    search.setAttribute("aria-label", "\u041D\u0430\u0439\u0442\u0438 \u0437\u0430\u0434\u0430\u0447\u0443");
    search.classList.add("dl-search");
    search.oninput = () => {
      this.query = search.value;
      this.render();
    };
    taskHeader.append(heading, search);
    taskColumn.append(taskHeader);
    const tabs = el("div", "dl-tabs");
    for (const [key, label] of [["all", "\u0412\u0441\u0435"], ["open", "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435"], ["done", "\u0413\u043E\u0442\u043E\u0432\u043E"]]) {
      const tab = button(label, () => {
        this.filter = key;
        this.render();
      }, `dl-tab ${this.filter === key ? "is-active" : ""}`);
      tab.setAttribute("aria-pressed", String(this.filter === key));
      tabs.append(tab);
    }
    taskColumn.append(tabs, this.quickAdd());
    const visible = tasks.filter((t) => (this.filter === "all" ? this.store.settings.showCompleted || t.status === "open" : t.status === this.filter) && `${t.title} ${t.description} ${t.labels.map((label) => label.name).join(" ")}`.toLocaleLowerCase().includes(this.query.toLocaleLowerCase()));
    const overdue = scope === "day" ? this.data.tasks.filter((t) => t.status === "open" && t.scope === "day" && t.scheduled < this.selected && this.selected <= dateKey()) : [];
    if (overdue.length && !this.query && this.filter !== "done") {
      const banner = el("div", "dl-overdue-banner");
      banner.append(el("strong", "", `\u041D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0441 \u043F\u0440\u043E\u0448\u043B\u044B\u0445 \u0434\u043D\u0435\u0439 \xB7 ${overdue.length}`), el("p", "", this.store.settings.autoRollover ? "\u0417\u0430\u0434\u0430\u0447\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u043D\u0438\u0436\u0435. \u0410\u0432\u0442\u043E\u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u043D\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0434\u0435\u043D\u044C \u2014 \u0432 12:00 \u043F\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430." : "\u0410\u0432\u0442\u043E\u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D. \u0414\u0430\u0442\u0443 \u043C\u043E\u0436\u043D\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0432 \u0444\u043E\u0440\u043C\u0435 \u0437\u0430\u0434\u0430\u0447\u0438."));
      taskColumn.append(banner);
    }
    if (!visible.length) taskColumn.append(this.empty(this.query ? "\u0417\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" : "\u041D\u0435\u0442 \u0437\u0430\u0434\u0430\u0447", this.query ? "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441." : "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0432 \u043F\u043E\u043B\u0435 \u0432\u044B\u0448\u0435."));
    else {
      const sorted = [...visible].sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || { high: 0, normal: 1, low: 2 }[a.priority] - { high: 0, normal: 1, low: 2 }[b.priority] || a.scheduled.localeCompare(b.scheduled));
      const list = el("div", "dl-task-list");
      list.setAttribute("aria-label", "\u0417\u0430\u0434\u0430\u0447\u0438");
      sorted.forEach((task) => list.append(this.taskRow(task, scope !== "day")));
      taskColumn.append(list);
    }
    const rail = el("aside", "dl-context-rail");
    rail.append(scope === "day" ? this.dailyHabits(habits) : this.habitAnalysis(scope));
    if (scope === "day") rail.append(this.weekFocus());
    else rail.append(this.goalPreview());
    columns.append(taskColumn, rail);
    page.append(columns);
    return page;
  }
  quickAdd() {
    const form = el("form", "dl-quick-add");
    const plus = icon("plus");
    const title = input(this.draft, "text", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443");
    title.dataset.focus = "quick";
    title.setAttribute("aria-label", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0439 \u0437\u0430\u0434\u0430\u0447\u0438");
    title.oninput = () => {
      this.draft = title.value;
    };
    title.maxLength = 500;
    const submit = el("button", "dl-quick-submit");
    submit.type = "submit";
    submit.setAttribute("aria-label", "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443");
    submit.append(icon("arrow"));
    form.append(plus, title, submit);
    form.onsubmit = async (event) => {
      var _a;
      event.preventDefault();
      const value = title.value.trim();
      if (!value || submit.disabled) return;
      submit.disabled = true;
      try {
        await this.store.createTask({ title: value, scheduled: this.selected, scope: this.taskScope() });
        this.draft = "";
        await this.refresh();
        (_a = this.root.querySelector('[data-focus="quick"]')) == null ? void 0 : _a.focus();
      } catch (error) {
        this.host.notify(String(error));
        submit.disabled = false;
      }
    };
    return form;
  }
  taskScope() {
    return ["day", "week", "month", "year"].includes(this.screen) ? this.screen : "day";
  }
  taskRow(task, showDate) {
    var _a;
    const row = el("div", `dl-task-row ${task.status === "done" ? "is-done" : ""}`);
    const check = input("", "checkbox");
    check.className = "dl-checkbox";
    check.checked = task.status === "done";
    check.setAttribute("aria-label", `${task.status === "done" ? "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432 \u0440\u0430\u0431\u043E\u0442\u0443" : "\u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C"}: ${task.title}`);
    check.onchange = () => {
      check.disabled = true;
      void this.action(() => this.store.setTaskStatus(task.path, check.checked ? "done" : "open"));
    };
    const body = el("div", "dl-task-body");
    body.append(button(task.title, () => this.taskDialog(task), "dl-task-title"));
    const metadata = el("div", "dl-task-meta");
    task.labels.forEach((label) => metadata.append(el("span", `dl-label dl-label-${label.color}`, label.name)));
    if (task.priority === "high") metadata.append(el("span", "dl-tag dl-tag-priority", "\u2191 \u0412\u044B\u0441\u043E\u043A\u0438\u0439 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442"));
    if (task.priority === "low") metadata.append(el("span", "dl-tag", "\u2193 \u041D\u0438\u0437\u043A\u0438\u0439 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442"));
    const goal = this.data.goals.find((g) => g.id === task.goal);
    if (goal) {
      const tag = el("span", "dl-task-goal");
      tag.append(icon("target"), el("span", "", goal.title));
      metadata.append(tag);
    }
    if (task.recurrence !== "none") {
      const repeat = el("span", "dl-task-repeat");
      repeat.append(icon("repeat"), el("span", "", REPEATS[task.recurrence]));
      metadata.append(repeat);
    }
    if (showDate || task.scheduled !== this.selected) metadata.append(el("span", "", `${displayDate(task.scheduled)}${task.scope !== "day" ? ` \xB7 ${SCOPES[task.scope]}` : ""}`));
    if (task.due) metadata.append(el("span", task.due < dateKey() && task.status === "open" ? "dl-late" : "", `\u0414\u043E ${displayDate(task.due)}`));
    const moved = task.history.filter((h) => h.type === "moved");
    if (moved.length) metadata.append(el("span", "dl-moved", `\u21AA \u0441 ${displayDate((_a = moved[0].from) != null ? _a : task.created)} \xB7 ${moved.length} \u043F\u0435\u0440\u0435\u043D\u043E\u0441${moved.length === 1 ? "" : "\u043E\u0432"}`));
    const checkTarget = el("label", "dl-checkbox-target");
    checkTarget.append(check);
    if (metadata.childElementCount) body.append(metadata);
    row.append(checkTarget, body);
    const menu = button("\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441 \u0437\u0430\u0434\u0430\u0447\u0435\u0439", () => this.taskActions(task), "dl-icon-button dl-row-menu", "dots");
    row.append(menu);
    return row;
  }
  taskActions(task) {
    this.host.dialog("\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0441 \u0437\u0430\u0434\u0430\u0447\u0435\u0439", (body, close) => {
      body.append(el("p", "dl-subtitle", task.title));
      const actions = el("div", "dl-action-list");
      actions.append(button("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", () => {
        close();
        this.taskDialog(task);
      }, "dl-button", "file"), button("\u041E\u0442\u043A\u0440\u044B\u0442\u044C Markdown", () => {
        close();
        void this.action(() => this.host.openFile(task.path));
      }, "dl-button", "file"), button("\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", () => {
        close();
        void this.action(() => this.store.setTaskStatus(task.path, "cancelled"), "\u0417\u0430\u0434\u0430\u0447\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430. \u0424\u0430\u0439\u043B \u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.");
      }, "dl-button", "close"), button("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", () => {
        close();
        void this.action(() => this.store.deleteTask(task.path), "\u0417\u0430\u0434\u0430\u0447\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430. \u0424\u0430\u0439\u043B \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0451\u043D \u0432 .trash.");
      }, "dl-button dl-danger", "trash"));
      body.append(actions);
    });
  }
  dailyHabits(habits) {
    const box = el("section", "dl-card");
    const header = el("div", "dl-section-header");
    header.append(el("h2", "", "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438"), button("\u0412\u0441\u0435 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438", () => this.navigate("habits"), "dl-icon-button", "arrow"));
    box.append(header);
    if (!habits.length) box.append(button("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0443", () => this.habitDialog(), "dl-add-habit", "plus"));
    for (const habit of habits) {
      const done = habit.completions.includes(this.selected);
      const row = button(habit.title, () => {
        void this.action(() => this.store.toggleHabit(habit.path, this.selected));
      }, `dl-habit-daily ${done ? "is-done" : ""}`);
      const check = el("span", "dl-habit-check");
      if (done) check.append(icon("check"));
      row.prepend(check);
      row.disabled = this.selected > dateKey();
      row.setAttribute("aria-pressed", String(done));
      box.append(row);
    }
    return box;
  }
  habitAnalysis(scope) {
    const box = el("section", "dl-card dl-habit-analysis");
    box.setAttribute("aria-label", "\u0410\u043D\u0430\u043B\u0438\u0437 \u043F\u0440\u0438\u0432\u044B\u0447\u0435\u043A");
    box.append(el("h2", "", `\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \xB7 ${SCOPES[scope].toLocaleLowerCase()}`));
    const habits = this.data.habits.filter((h) => !h.archived);
    if (!habits.length) box.append(el("p", "dl-card-subtitle", "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0430\u0445."));
    for (const habit of habits) {
      const data = analyzeHabit(habit, scope, this.selected, dateKey());
      const row = el("div", "dl-habit-analysis-row");
      row.append(el("strong", "", habit.title));
      if (data.percent === null) row.append(el("p", "", "\u0417\u0430 \u044D\u0442\u043E\u0442 \u043F\u0435\u0440\u0438\u043E\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0434\u043D\u0435\u0439."));
      else {
        row.append(el("p", "", `${data.completed} \u0438\u0437 ${data.planned} \xB7 ${data.percent}%`), meter(data.percent), el("small", "", `\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E: ${data.missed}${data.pending ? " \xB7 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0435\u0449\u0451 \u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E" : ""}`));
      }
      box.append(row);
    }
    box.append(el("p", "dl-card-subtitle", "\u0423\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u0434\u043D\u0438 \u043F\u043E \u0440\u0430\u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044E \u0434\u043E \u0441\u0435\u0433\u043E\u0434\u043D\u044F\u0448\u043D\u0435\u0433\u043E \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u043B\u044C\u043D\u043E. \u0411\u0443\u0434\u0443\u0449\u0438\u0435 \u0434\u043D\u0438 \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u043C\u0438."));
    return box;
  }
  weekFocus() {
    const box = el("section", "dl-card dl-focus-card");
    box.append(el("h2", "", "\u041F\u043B\u0430\u043D\u044B \u043D\u0435\u0434\u0435\u043B\u0438"));
    const tasks = this.data.tasks.filter((t) => t.scope === "week" && t.status === "open" && inPeriod(t.scheduled, "week", this.selected));
    if (tasks.length) tasks.slice(0, 3).forEach((t) => box.append(button(t.title, () => this.taskDialog(t), "dl-focus-task", "target")));
    else box.append(el("p", "", "\u041F\u043B\u0430\u043D\u043E\u0432 \u043D\u0430 \u043D\u0435\u0434\u0435\u043B\u044E \u043D\u0435\u0442."));
    box.append(button("\u041A \u043F\u043B\u0430\u043D\u0430\u043C \u043D\u0435\u0434\u0435\u043B\u0438", () => this.navigate("week"), "dl-text-button", "arrow"));
    return box;
  }
  goalPreview() {
    const box = el("section", "dl-card dl-focus-card");
    box.append(el("h2", "", "\u0426\u0435\u043B\u0438"));
    const goals = this.data.goals.filter((g) => g.status === "active");
    if (!goals.length) box.append(el("p", "", "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0446\u0435\u043B\u0435\u0439 \u043D\u0435\u0442."));
    goals.slice(0, 3).forEach((g) => box.append(button(g.title, () => this.goalDialog(g), "dl-focus-task", "target")));
    box.append(button("\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0446\u0435\u043B\u0438", () => this.navigate("goals"), "dl-text-button", "arrow"));
    return box;
  }
  empty(title, subtitle) {
    const box = el("div", "dl-empty");
    box.append(el("h3", "", title), el("p", "", subtitle));
    return box;
  }
  goalsPage() {
    const page = el("div");
    page.append(this.pageHeader("", "\u0426\u0435\u043B\u0438", "", [button("\u041D\u043E\u0432\u0430\u044F \u0446\u0435\u043B\u044C", () => this.goalDialog(), "dl-button dl-button-primary", "plus")]));
    const goals = this.data.goals.filter((g) => g.status !== "archived");
    if (!goals.length) page.append(this.empty("\u041D\u0435\u0442 \u0446\u0435\u043B\u0435\u0439", "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0446\u0435\u043B\u044C \u0438 \u0441\u0432\u044F\u0436\u0438\u0442\u0435 \u0441 \u043D\u0435\u0439 \u0437\u0430\u0434\u0430\u0447\u0438."));
    const grid = el("div", "dl-goal-grid");
    for (const goal of goals) {
      const tasks = this.data.tasks.filter((t) => t.goal === goal.id && t.status !== "cancelled");
      const card = el("section", `dl-goal-card ${goal.status === "done" ? "is-done" : ""}`);
      const top = el("div", "dl-section-header");
      top.append(el("span", "dl-goal-state", goal.status === "done" ? "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442\u0430" : "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435"), button("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0446\u0435\u043B\u044C", () => this.goalDialog(goal), "dl-icon-button", "dots"));
      card.append(top, el("h2", "", goal.title));
      if (goal.description) card.append(el("p", "dl-goal-description", goal.description));
      if (goal.target) card.append(el("p", `dl-goal-date ${goal.target < dateKey() && goal.status === "active" ? "dl-late" : ""}`, `\u0421\u0440\u043E\u043A: ${displayDate(goal.target, { day: "numeric", month: "long", year: "numeric" })}`));
      if (tasks.length) {
        const linked = el("details", "dl-linked-tasks");
        linked.append(el("summary", "", "\u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438"));
        tasks.forEach((task) => linked.append(this.taskRow(task, true)));
        card.append(linked);
      }
      card.append(button("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", () => this.taskDialog(void 0, goal.id), "dl-text-button", "plus"));
      grid.append(card);
    }
    page.append(grid);
    return page;
  }
  habitsPage() {
    const page = el("div");
    page.append(this.pageHeader("", "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438", "", [button("\u041D\u043E\u0432\u0430\u044F \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0430", () => this.habitDialog(), "dl-button dl-button-primary", "plus")]));
    const nav = el("div", "dl-habit-week-nav");
    nav.append(button("\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F", () => {
      this.selected = shiftDay(this.selected, -7);
      this.render();
    }, "dl-icon-button", "left"), el("strong", "", `${displayDate(weekDays(this.selected)[0])} \u2014 ${displayDate(weekDays(this.selected)[6])}`), button("\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F", () => {
      this.selected = shiftDay(this.selected, 7);
      this.render();
    }, "dl-icon-button", "right"));
    page.append(nav);
    const habits = this.data.habits.filter((h) => !h.archived);
    if (!habits.length) page.append(this.empty("\u041D\u0435\u0442 \u043F\u0440\u0438\u0432\u044B\u0447\u0435\u043A", "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0443 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043D\u0438 \u043D\u0435\u0434\u0435\u043B\u0438."));
    const tableWrap = el("div", "dl-habit-table-wrap");
    const table = el("table", "dl-habit-table");
    const thead = el("thead");
    const head = el("tr");
    head.append(el("th", "", "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0430"));
    weekDays(this.selected).forEach((date, i) => {
      const th = el("th", date === dateKey() ? "is-today" : "");
      th.append(el("span", "", WEEKDAYS[i]), el("strong", "", String(parseDate(date).getDate())));
      head.append(th);
    });
    thead.append(head);
    table.append(thead);
    const tbody = el("tbody");
    for (const habit of habits) {
      const row = el("tr");
      const label = el("td");
      label.append(button(habit.title, () => this.habitDialog(habit), "dl-habit-title"));
      row.append(label);
      for (const date of weekDays(this.selected)) {
        const cell = el("td");
        const due = habitDue(habit.days, date) && habit.created <= date;
        const done = habit.completions.includes(date);
        const toggle = button(`${habit.title}, ${displayDate(date)}: ${done ? "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" : due ? "\u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" : "\u0432\u044B\u0445\u043E\u0434\u043D\u043E\u0439"}`, () => {
          void this.action(() => this.store.toggleHabit(habit.path, date));
        }, `dl-habit-cell ${done ? "is-done" : ""} ${!due ? "is-rest" : ""}`);
        toggle.replaceChildren(done ? icon("check") : el("span", "", due ? "" : "\u2014"));
        toggle.disabled = !due || date > dateKey();
        toggle.setAttribute("aria-pressed", String(done));
        cell.append(toggle);
        row.append(cell);
      }
      tbody.append(row);
    }
    table.append(tbody);
    tableWrap.append(table);
    if (habits.length) page.append(tableWrap);
    return page;
  }
  togglePanels() {
    var _a, _b;
    this.store.settings.tasksOnly = !this.store.settings.tasksOnly;
    this.render();
    void ((_b = (_a = this.host).persistSettings) == null ? void 0 : _b.call(_a).catch((error) => this.host.notify(String(error))));
  }
  statsPage() {
    const page = el("div", "dl-statistics");
    page.append(this.pageHeader("", "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430", "", []));
    const scope = select(SCOPES, this.statsScope);
    scope.setAttribute("aria-label", "\u041F\u0435\u0440\u0438\u043E\u0434 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438");
    scope.onchange = () => {
      this.statsScope = scope.value;
      this.render();
    };
    const controls = el("div", "dl-stat-controls");
    controls.append(scope, button("\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", () => {
      this.selected = stepPeriod(this.selected, this.statsScope, -1);
      this.render();
    }, "dl-icon-button", "left"), input(this.selected, "date"), button("\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434", () => {
      this.selected = stepPeriod(this.selected, this.statsScope, 1);
      this.render();
    }, "dl-icon-button", "right"));
    const date = controls.querySelector("input");
    date.setAttribute("aria-label", "\u0414\u0430\u0442\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438");
    date.onchange = () => {
      if (date.value) {
        this.selected = date.value;
        this.render();
      }
    };
    page.append(controls, el("p", "dl-subtitle", `\u041F\u0435\u0440\u0438\u043E\u0434: ${periodKey(this.statsScope, this.selected)}`));
    const inRange = (date2) => !!date2 && inPeriod(date2, this.statsScope, this.selected);
    const planned = this.data.tasks.filter((t) => inRange(t.scheduled) && t.status !== "cancelled");
    const completed = this.data.tasks.reduce((n, t) => n + (t.recurrence === "none" ? Number(t.status === "done" && inRange(t.completed)) : t.history.filter((h) => h.type === "completed" && inRange(h.date)).length), 0);
    const moved = this.data.tasks.reduce((n, t) => n + t.history.filter((h) => h.type === "moved" && inRange(h.date)).length, 0);
    const stats = el("div", "dl-stats");
    for (const [label, value] of [["\u0412 \u0440\u0430\u0431\u043E\u0442\u0435", planned.filter((t) => t.status === "open").length], ["\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434", completed], ["\u041F\u0435\u0440\u0435\u043D\u043E\u0441\u043E\u0432", moved]]) {
      const stat = el("div", "dl-stat");
      stat.append(el("span", "dl-stat-label", label), el("strong", "dl-stat-value", String(value)));
      stats.append(stat);
    }
    page.append(stats);
    const goals = el("section", "dl-card dl-stat-section");
    goals.append(el("h2", "", "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0446\u0435\u043B\u0435\u0439"));
    for (const goal of this.data.goals.filter((g) => g.status !== "archived")) {
      const tasks = this.data.tasks.filter((t) => t.goal === goal.id && t.status !== "cancelled");
      const done = tasks.filter((t) => t.status === "done").length;
      const row = el("div", "dl-stat-row");
      row.append(el("span", "", goal.title), el("span", "", `${done} \u0438\u0437 ${tasks.length}`), meter(goal.status === "done" ? 100 : tasks.length ? done / tasks.length * 100 : 0));
      goals.append(row);
    }
    if (goals.childElementCount === 1) goals.append(el("p", "dl-subtitle", "\u041D\u0435\u0442 \u0446\u0435\u043B\u0435\u0439."));
    page.append(goals);
    const habits = this.data.habits.filter((h) => !h.archived);
    const habitStats = el("section", "dl-card dl-stat-section");
    habitStats.append(el("h2", "", "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438"));
    for (const habit of habits) {
      const row = el("div", "dl-stat-row");
      row.append(el("span", "", habit.title), el("span", "", `${habit.completions.filter(inRange).length} \u043E\u0442\u043C\u0435\u0442\u043E\u043A \xB7 \u0441\u0435\u0440\u0438\u044F \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F: ${habitStreak(habit.days, habit.completions, dateKey(), habit.created)} \u0434\u043D.`));
      habitStats.append(row);
    }
    if (!habits.length) habitStats.append(el("p", "dl-subtitle", "\u041D\u0435\u0442 \u043F\u0440\u0438\u0432\u044B\u0447\u0435\u043A."));
    page.append(habitStats);
    const history = el("section", "dl-card dl-history");
    history.append(el("h2", "", "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430 12 \u043D\u0435\u0434\u0435\u043B\u044C"));
    const heatmap = el("div", "dl-heatmap");
    for (let offset = -83; offset <= 0; offset++) {
      const date2 = shiftDay(dateKey(), offset);
      const available = habits.filter((h) => h.created <= date2 && habitDue(h.days, date2));
      const n = available.filter((h) => h.completions.includes(date2)).length;
      const level = !available.length || !n ? 0 : n === available.length ? 3 : n / available.length >= 0.5 ? 2 : 1;
      const cell = button(`${displayDate(date2)}: ${n} \u0438\u0437 ${available.length} \u043F\u0440\u0438\u0432\u044B\u0447\u0435\u043A`, () => this.navigate("day", date2), `dl-heat-cell dl-heat-${level}`);
      cell.replaceChildren();
      cell.title = cell.getAttribute("aria-label");
      heatmap.append(cell);
    }
    history.append(heatmap);
    page.append(history);
    page.append(el("p", "dl-subtitle", "\u0421\u0432\u043E\u0434\u043A\u0430 \u0437\u0430\u0434\u0430\u0447 \u0438 \u043E\u0442\u043C\u0435\u0442\u043E\u043A \u2014 \u0437\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434. \u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0446\u0435\u043B\u0435\u0439 \u2014 \u0437\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F. \u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u0440\u0438\u0432\u044B\u0447\u0435\u043A \u2014 \u0437\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 12 \u043D\u0435\u0434\u0435\u043B\u044C. \u0414\u0430\u0442\u044B \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u0434\u0430\u0447, \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0445 \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0432 Markdown, \u043C\u043E\u0433\u0443\u0442 \u0431\u044B\u0442\u044C \u043D\u0435\u0442\u043E\u0447\u043D\u044B\u043C\u0438."));
    return page;
  }
  taskDialog(task, goalId) {
    this.host.dialog(task ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443" : "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u0434\u0430\u0447\u0430", (body, close) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      const form = el("form", "dl-form");
      const title = input((_a = task == null ? void 0 : task.title) != null ? _a : this.draft, "text", "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u043D\u0430\u0431\u0440\u043E\u0441\u0430\u0442\u044C \u043F\u043B\u0430\u043D \u043F\u0440\u043E\u0435\u043A\u0442\u0430");
      title.required = true;
      title.maxLength = 500;
      const scheduled = input((_b = task == null ? void 0 : task.scheduled) != null ? _b : this.selected, "date");
      scheduled.required = true;
      const scope = select(SCOPES, (_c = task == null ? void 0 : task.scope) != null ? _c : this.taskScope());
      const priority = select(PRIORITIES, (_d = task == null ? void 0 : task.priority) != null ? _d : "normal");
      const repeat = select(REPEATS, (_e = task == null ? void 0 : task.recurrence) != null ? _e : "none");
      const goals = { "": "\u0411\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043A \u0446\u0435\u043B\u0438" };
      this.data.goals.filter((g) => g.status !== "archived" || g.id === (task == null ? void 0 : task.goal)).forEach((g) => {
        goals[g.id] = g.title;
      });
      const goal = select(goals, (_g = (_f = task == null ? void 0 : task.goal) != null ? _f : goalId) != null ? _g : "");
      const due = input((_h = task == null ? void 0 : task.due) != null ? _h : "", "date");
      const notes = textarea((_i = task == null ? void 0 : task.description) != null ? _i : "", "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F Markdown.");
      const grid = el("div", "dl-form-grid");
      grid.append(field("\u0414\u0430\u0442\u0430 \u043F\u043B\u0430\u043D\u0430", scheduled), field("\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442", scope), field("\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442", priority), field("\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435", repeat), field("\u0421\u0440\u043E\u043A (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", due), field("\u0426\u0435\u043B\u044C", goal));
      const labels = ((_j = task == null ? void 0 : task.labels) != null ? _j : []).map((label) => ({ ...label }));
      const labelEditor = this.labelsEditor(labels);
      form.append(field("\u0417\u0430\u0434\u0430\u0447\u0430", title), grid, labelEditor.element, field("\u0417\u0430\u043C\u0435\u0442\u043A\u0438", notes));
      if ((task == null ? void 0 : task.recurrence) !== "none" || !task) form.append(el("p", "dl-form-hint", "\u041F\u0440\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0430\u044F\u0441\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u0437\u0430\u043F\u0438\u0448\u0435\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0443\u044E \u0434\u0430\u0442\u0443. \u041F\u043E\u0432\u0442\u043E\u0440 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u0437\u0430\u0434\u0430\u0447 \u0434\u043D\u044F."));
      if (task == null ? void 0 : task.history.length) {
        const history = el("details", "dl-occurrences");
        history.append(el("summary", "", "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u0434\u0430\u0447\u0438"));
        task.history.slice().reverse().forEach((h) => {
          var _a2, _b2;
          return history.append(el("p", "", `${h.at ? new Date(h.at).toLocaleString("ru-RU") : displayDate(h.date)} \xB7 ${h.type === "moved" ? `\u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u0441 ${(_a2 = h.from) != null ? _a2 : "\u2014"} \u043D\u0430 ${(_b2 = h.to) != null ? _b2 : "\u2014"}${h.automatic ? " \xB7 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438" : ""}` : h.type === "completed" ? "\u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430" : h.type === "cancelled" ? "\u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430" : "\u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443"}`));
        });
        form.append(history);
      }
      this.formActions(form, close, async () => {
        if (repeat.value !== "none" && scope.value !== "day") throw new Error("\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F \u0437\u0430\u0434\u0430\u0447\u0438 \u0434\u043E\u043B\u0436\u043D\u044B \u0438\u043C\u0435\u0442\u044C \u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442 \xAB\u0414\u0435\u043D\u044C\xBB");
        labelEditor.commit();
        const values = { title: title.value, scheduled: scheduled.value, scope: scope.value, priority: priority.value, recurrence: repeat.value, goal: goal.value, labels, due: due.value, description: notes.value };
        if (task) await this.store.updateTask(task.path, values);
        else {
          await this.store.createTask(values);
          this.draft = "";
        }
      }, task ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", task ? button("Markdown", () => {
        close();
        void this.action(() => this.host.openFile(task.path));
      }, "dl-button dl-button-secondary", "file") : void 0);
      body.append(form);
      window.setTimeout(() => title.focus(), 20);
    });
  }
  labelsEditor(labels) {
    const group = el("section", "dl-label-editor");
    group.setAttribute("aria-label", "\u041C\u0435\u0442\u043A\u0438 \u0437\u0430\u0434\u0430\u0447\u0438");
    group.append(el("div", "dl-field-label", "\u041C\u0435\u0442\u043A\u0438"));
    const chips = el("div", "dl-label-chips");
    const render = () => {
      chips.replaceChildren();
      labels.forEach((label, index) => chips.append(button(`${label.name} \xD7`, () => {
        labels.splice(index, 1);
        render();
      }, `dl-label dl-label-${label.color}`)));
    };
    const name = input("", "text", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u0435\u0442\u043A\u0438");
    name.maxLength = 60;
    name.setAttribute("aria-label", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u0435\u0442\u043A\u0438");
    const color = select(LABEL_COLORS, "blue");
    color.setAttribute("aria-label", "\u0426\u0432\u0435\u0442 \u043C\u0435\u0442\u043A\u0438");
    const add = () => {
      const normalized = normalizeLabels([...labels, { name: name.value, color: color.value }]);
      labels.splice(0, labels.length, ...normalized);
      name.value = "";
      render();
    };
    name.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        add();
      }
    };
    const controls = el("div", "dl-label-controls");
    controls.append(name, color, button("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043C\u0435\u0442\u043A\u0443", add, "dl-button dl-button-secondary", "plus"));
    group.append(chips, controls);
    const suggestions = el("div", "dl-label-chips");
    const seen = /* @__PURE__ */ new Set();
    for (const label of this.data.tasks.flatMap((task) => task.labels)) {
      if (seen.has(label.name)) continue;
      seen.add(label.name);
      suggestions.append(button(label.name, () => {
        if (!labels.some((l) => l.name.toLocaleLowerCase() === label.name.toLocaleLowerCase())) labels.push({ ...label });
        render();
      }, `dl-label dl-label-${label.color}`));
    }
    if (suggestions.childElementCount) {
      group.append(el("span", "dl-form-hint", "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u043D\u0435\u0435"), suggestions);
    }
    group.addEventListener("focusout", (event) => {
      if (!group.contains(event.relatedTarget) && name.value.trim()) add();
    });
    render();
    return { element: group, commit: add };
  }
  goalDialog(goal) {
    this.host.dialog(goal ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0446\u0435\u043B\u044C" : "\u041D\u043E\u0432\u0430\u044F \u0446\u0435\u043B\u044C", (body, close) => {
      var _a, _b, _c, _d;
      const form = el("form", "dl-form");
      const title = input((_a = goal == null ? void 0 : goal.title) != null ? _a : "", "text", "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u043F\u0440\u043E\u0431\u0435\u0436\u0430\u0442\u044C \u043F\u0435\u0440\u0432\u044B\u0435 10 \u043A\u043C");
      title.required = true;
      const target = input((_b = goal == null ? void 0 : goal.target) != null ? _b : "", "date");
      const status = select({ active: "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435", done: "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442\u0430", archived: "\u0412 \u0430\u0440\u0445\u0438\u0432\u0435" }, (_c = goal == null ? void 0 : goal.status) != null ? _c : "active");
      const notes = textarea((_d = goal == null ? void 0 : goal.description) != null ? _d : "", "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0446\u0435\u043B\u0438 \u0438 \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F.");
      form.append(field("\u0426\u0435\u043B\u044C", title), field("\u0421\u0440\u043E\u043A", target));
      if (goal) form.append(field("\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435", status));
      form.append(field("\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435", notes), el("p", "dl-form-hint", "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u043C \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u043C \u0437\u0430\u0434\u0430\u0447\u0430\u043C. \u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u0435 \u0446\u0435\u043B\u0438 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E."));
      const extras = el("div", "dl-inline");
      if (goal) {
        extras.append(button("Markdown", () => {
          close();
          void this.action(() => this.host.openFile(goal.path));
        }, "dl-button dl-button-secondary", "file"), button("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0446\u0435\u043B\u044C", () => {
          close();
          void this.action(() => this.store.deleteGoal(goal.path), "\u0426\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0430 \u0432 .trash. \u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B.");
        }, "dl-button dl-danger", "trash"));
        form.append(el("p", "dl-form-hint", "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0435\u0442 \u0444\u0430\u0439\u043B \u0446\u0435\u043B\u0438 \u0432 .trash. \u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F; \u043F\u043E\u0441\u043B\u0435 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0446\u0435\u043B\u0438 \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B \u0441\u0432\u044F\u0437\u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u0441\u044F."));
      }
      this.formActions(form, close, () => this.store.saveGoal({ path: goal == null ? void 0 : goal.path, title: title.value, target: target.value, description: notes.value, status: status.value }), "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0446\u0435\u043B\u044C", goal ? extras : void 0);
      body.append(form);
    });
  }
  habitDialog(habit) {
    this.host.dialog(habit ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0443" : "\u041D\u043E\u0432\u0430\u044F \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0430", (body, close) => {
      var _a, _b, _c;
      const form = el("form", "dl-form");
      const title = input((_a = habit == null ? void 0 : habit.title) != null ? _a : "", "text", "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 20 \u043C\u0438\u043D\u0443\u0442 \u0447\u0442\u0435\u043D\u0438\u044F");
      title.required = true;
      const notes = textarea((_b = habit == null ? void 0 : habit.description) != null ? _b : "", "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438.");
      const days = new Set((_c = habit == null ? void 0 : habit.days) != null ? _c : [0, 1, 2, 3, 4, 5, 6]);
      const choices = el("div", "dl-day-choices");
      WEEKDAYS.forEach((name, i) => {
        const day = (i + 1) % 7;
        const toggle = button(name, () => {
          if (days.has(day)) days.delete(day);
          else days.add(day);
          toggle.classList.toggle("is-active", days.has(day));
          toggle.setAttribute("aria-pressed", String(days.has(day)));
        }, `dl-day-choice ${days.has(day) ? "is-active" : ""}`);
        toggle.setAttribute("aria-pressed", String(days.has(day)));
        choices.append(toggle);
      });
      form.append(field("\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0430", title), field("\u0412 \u043A\u0430\u043A\u0438\u0435 \u0434\u043D\u0438?", choices), field("\u0417\u0430\u043C\u0435\u0442\u043A\u0438", notes));
      const extras = el("div", "dl-inline");
      if (habit) extras.append(button("\u0412 \u0430\u0440\u0445\u0438\u0432", () => {
        close();
        void this.action(() => this.store.saveHabit({ ...habit, archived: true }), "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0430 \u0432 \u0430\u0440\u0445\u0438\u0432\u0435. \u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430 \u0432 Markdown.");
      }, "dl-button dl-button-quiet"), button("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0443", () => {
        close();
        void this.action(() => this.store.deleteHabit(habit.path), "\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0430 \u0438 \u0435\u0451 \u043E\u0442\u043C\u0435\u0442\u043A\u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u044B \u0432 .trash.");
      }, "dl-button dl-danger", "trash"));
      if (habit) form.append(button("\u041E\u0442\u043A\u0440\u044B\u0442\u044C Markdown", () => {
        close();
        void this.action(() => this.host.openFile(habit.path));
      }, "dl-text-button", "file"));
      this.formActions(form, close, () => this.store.saveHabit({ path: habit == null ? void 0 : habit.path, title: title.value, days: [...days], description: notes.value }), "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0443", habit ? extras : void 0);
      body.append(form);
    });
  }
  formActions(form, close, save, label, extra) {
    const error = el("p", "dl-form-error");
    error.setAttribute("role", "alert");
    const actions = el("div", "dl-form-actions");
    const submit = el("button", "dl-button dl-button-primary", label);
    submit.type = "submit";
    if (extra) actions.append(extra);
    actions.append(button("\u041E\u0442\u043C\u0435\u043D\u0430", close, "dl-button dl-button-secondary"), submit);
    form.append(error, actions);
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      error.textContent = "";
      try {
        await save();
        close();
        await this.refresh();
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
        submit.disabled = false;
      }
    };
  }
};

// src/main.ts
init_identity();
var VIEW = `${PLUGIN_ID}-planner`;
var PlannerModal = class extends import_obsidian2.Modal {
  constructor(app, title, render) {
    super(app);
    this.title = title;
    this.render = render;
  }
  onOpen() {
    this.titleEl.setText(this.title);
    this.modalEl.addClass("dl-modal");
    this.contentEl.addClass("dl-dialog");
    this.render(this.contentEl, () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};
var PlannerView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    __publicField(this, "dashboard");
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return PLUGIN_NAME;
  }
  getIcon() {
    return "sun";
  }
  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("dl-view");
    this.dashboard = new Dashboard(this.contentEl, this.plugin.store, this.plugin.host());
    await this.dashboard.refresh();
  }
  async onClose() {
    var _a;
    this.plugin.setTasksOnly(false);
    (_a = this.dashboard) == null ? void 0 : _a.destroy();
    this.dashboard = void 0;
  }
};
var SmartTodoPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "store");
    __publicField(this, "refreshTimer");
    __publicField(this, "noonTimer");
    __publicField(this, "checking", false);
    __publicField(this, "lastDay", "");
    __publicField(this, "unloaded", false);
    __publicField(this, "savedPanels");
  }
  setTasksOnly(enabled) {
    var _a;
    const { leftSplit, rightSplit } = this.app.workspace;
    if (enabled && !this.unloaded) {
      (_a = this.savedPanels) != null ? _a : this.savedPanels = { left: leftSplit.collapsed, right: rightSplit.collapsed };
      if (!leftSplit.collapsed) leftSplit.collapse();
      if (!rightSplit.collapsed) rightSplit.collapse();
    } else if (this.savedPanels) {
      const previous = this.savedPanels;
      this.savedPanels = void 0;
      if (!previous.left) leftSplit.expand();
      if (!previous.right) rightSplit.expand();
    }
  }
  async onload() {
    const saved = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...saved && typeof saved === "object" ? saved : {} };
    this.settings.autoRollover = typeof this.settings.autoRollover === "boolean" ? this.settings.autoRollover : true;
    this.settings.showCompleted = typeof this.settings.showCompleted === "boolean" ? this.settings.showCompleted : true;
    this.settings.tasksOnly = this.settings.tasksOnly === true;
    try {
      this.settings.root = normalizeRoot(this.settings.root);
    } catch (e) {
      this.settings.root = DEFAULT_SETTINGS.root;
      new import_obsidian2.Notice("Smart Todo: \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F _todotracking.");
    }
    this.store = new PlannerStore(new ObsidianStorage(this.app), { parse: import_obsidian2.parseYaml, stringify: import_obsidian2.stringifyYaml }, this.settings);
    this.registerView(VIEW, (leaf) => new PlannerView(leaf, this));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      var _a, _b;
      return this.setTasksOnly(((_b = (_a = this.app.workspace.getActiveViewOfType(PlannerView)) == null ? void 0 : _a.dashboard) == null ? void 0 : _b.isTasksOnlyMode()) === true);
    }));
    this.addRibbonIcon("sun", "\u041E\u0442\u043A\u0440\u044B\u0442\u044C Smart Todo", () => {
      void this.openPlanner();
    });
    this.addCommand({ id: "open-planner", name: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A", callback: () => {
      void this.openPlanner();
    } });
    this.addCommand({ id: "add-task", name: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0443", callback: () => {
      void this.openPlanner(true);
    } });
    this.addCommand({ id: "open-today", name: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F", callback: () => {
      void this.openNote();
    } });
    this.addCommand({ id: "rollover", name: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0430\u0432\u0442\u043E\u043F\u0435\u0440\u0435\u043D\u043E\u0441 (12:00)", callback: () => {
      void this.store.rollover().then((n) => {
        new import_obsidian2.Notice(this.settings.autoRollover ? `Smart Todo: \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u043E \u0437\u0430\u0434\u0430\u0447 \u2014 ${n}` : "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0430\u0432\u0442\u043E\u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 Smart Todo.");
        this.scheduleRefresh();
      }).catch((error) => this.report(error));
    } });
    this.addCommand({ id: "collect-checkboxes", name: "\u0421\u043E\u0431\u0440\u0430\u0442\u044C \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438", callback: () => {
      void this.collectFromActiveNote();
    } });
    this.addSettingTab(new PlannerSettings(this.app, this));
    const changed = (file) => {
      if (file.path.startsWith(`${this.settings.root}/`)) this.scheduleRefresh();
    };
    this.registerEvent(this.app.vault.on("create", changed));
    this.registerEvent(this.app.vault.on("modify", changed));
    this.registerEvent(this.app.vault.on("delete", changed));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (file.path.startsWith(`${this.settings.root}/`) || oldPath.startsWith(`${this.settings.root}/`)) this.scheduleRefresh();
    }));
    this.registerDomEvent(document, "visibilitychange", () => {
      if (!document.hidden) {
        this.scheduleNoon();
        void this.checkDay();
      }
    });
    this.registerDomEvent(window, "focus", () => {
      this.scheduleNoon();
      void this.checkDay();
    });
    this.registerInterval(window.setInterval(() => {
      void this.checkDay();
    }, 6e4));
    this.app.workspace.onLayoutReady(() => {
      if (!this.unloaded) {
        this.scheduleNoon();
        void this.checkDay();
      }
    });
  }
  onunload() {
    this.unloaded = true;
    this.setTasksOnly(false);
    if (this.refreshTimer !== void 0) window.clearTimeout(this.refreshTimer);
    if (this.noonTimer !== void 0) window.clearTimeout(this.noonTimer);
  }
  scheduleNoon() {
    if (this.unloaded) return;
    if (this.noonTimer !== void 0) window.clearTimeout(this.noonTimer);
    const now = /* @__PURE__ */ new Date();
    this.noonTimer = window.setTimeout(() => {
      this.noonTimer = void 0;
      void this.checkDay();
      this.scheduleNoon();
    }, nextNoon(now).getTime() - now.getTime());
  }
  report(error) {
    console.error("Smart Todo", error);
    new import_obsidian2.Notice(`Smart Todo: ${error instanceof Error ? error.message : String(error)}`, 8e3);
  }
  async checkDay() {
    if (this.checking || this.unloaded) return;
    this.checking = true;
    try {
      const n = await this.store.rollover();
      const changed = this.lastDay !== dateKey();
      this.lastDay = dateKey();
      if (n || changed) this.scheduleRefresh();
    } catch (error) {
      this.report(error);
    } finally {
      this.checking = false;
    }
  }
  scheduleRefresh() {
    if (this.refreshTimer !== void 0) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      var _a;
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PlannerView) void ((_a = leaf.view.dashboard) == null ? void 0 : _a.refresh().catch((error) => this.report(error)));
    }, 180);
  }
  host() {
    return {
      notify: (message) => {
        new import_obsidian2.Notice(message);
      },
      openFile: async (path) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof import_obsidian2.TFile) await this.app.workspace.getLeaf("tab").openFile(file);
        else throw new Error(`\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D: ${path}`);
      },
      dialog: (title, render) => {
        new PlannerModal(this.app, title, render).open();
      },
      persistSettings: () => this.saveSettings(),
      setTasksOnly: (enabled) => {
        if (this.app.workspace.getActiveViewOfType(PlannerView)) this.setTasksOnly(enabled);
      },
      settings: () => {
        new PlannerModal(this.app, "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", (body) => {
          new PlannerSettings(this.app, this).renderInto(body);
        }).open();
      }
    };
  }
  async openPlanner(addTask = false) {
    var _a, _b, _c;
    try {
      let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
      if (!leaf) {
        leaf = this.app.workspace.getLeaf("tab");
        await leaf.setViewState({ type: VIEW, active: true });
      }
      await this.app.workspace.revealLeaf(leaf);
      if (leaf.view instanceof PlannerView) {
        await ((_a = leaf.view.dashboard) == null ? void 0 : _a.refresh());
        (_b = leaf.view.dashboard) == null ? void 0 : _b.navigate("day", dateKey());
        if (addTask) (_c = leaf.view.dashboard) == null ? void 0 : _c.taskDialog();
      }
    } catch (error) {
      this.report(error);
    }
  }
  async openNote() {
    try {
      await this.host().openFile(await this.store.ensureNote("day", dateKey()));
    } catch (error) {
      this.report(error);
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.scheduleRefresh();
  }
  async collectFromActiveNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new import_obsidian2.Notice("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 Markdown-\u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0441 \u0437\u0430\u0434\u0430\u0447\u0430\u043C\u0438.");
      return;
    }
    if (file.path.startsWith(`${this.settings.root}/tasks/`)) {
      new import_obsidian2.Notice("\u042D\u0442\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u0443\u0436\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432 Smart Todo.");
      return;
    }
    try {
      const text = await this.app.vault.read(file);
      const { legacyTasks: legacyTasks2 } = await Promise.resolve().then(() => (init_legacy(), legacy_exports));
      const candidates = legacyTasks2(text);
      if (!candidates.length) {
        new import_obsidian2.Notice("\u0412 \u0437\u0430\u043C\u0435\u0442\u043A\u0435 \u043D\u0435\u0442 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0445 Markdown-\u0437\u0430\u0434\u0430\u0447.");
        return;
      }
      new PlannerModal(this.app, `\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 Smart Todo \xB7 ${candidates.length}`, (body, close) => {
        body.append(el("p", "", `\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ${file.path}. \u0417\u0430\u0434\u0430\u0447\u0438 \u0431\u0443\u0434\u0443\u0442 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u0432 \u043F\u043B\u0430\u043D \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F. \u0418\u0441\u0445\u043E\u0434\u043D\u0430\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439. \u041F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0438\u043C\u043F\u043E\u0440\u0442 \u0442\u043E\u0439 \u0436\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u043A\u043E\u043F\u0438\u0439.`));
        const list = el("ul", "dl-import-list");
        candidates.forEach((c) => list.append(el("li", "", c.title)));
        body.append(list);
        const save = button("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u0434\u0430\u0447\u0438", () => {
          save.disabled = true;
          void this.importTasks(file, text).then((n) => {
            close();
            new import_obsidian2.Notice(`Smart Todo: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u0437\u0430\u0434\u0430\u0447 \u2014 ${n}`);
            this.scheduleRefresh();
          }).catch((error) => {
            save.disabled = false;
            this.report(error);
          });
        }, "dl-button dl-button-primary", "plus");
        body.append(save);
      }).open();
    } catch (error) {
      this.report(error);
    }
  }
  async importTasks(file, text) {
    const { importLegacy: importLegacy2 } = await Promise.resolve().then(() => (init_legacy(), legacy_exports));
    return importLegacy2(this.store, file.path, text, dateKey());
  }
};
var PlannerSettings = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.renderInto(this.containerEl);
  }
  renderInto(container) {
    let root = this.plugin.settings.root;
    new import_obsidian2.Setting(container).setName("\u041F\u0430\u043F\u043A\u0430 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u0430").setDesc("\u041F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u0432\u0441\u0435 \u0444\u0430\u0439\u043B\u044B Smart Todo \u043F\u0435\u0440\u0435\u0435\u0434\u0443\u0442 \u0432 \u043D\u043E\u0432\u0443\u044E \u043F\u0430\u043F\u043A\u0443 \u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u0441\u0441\u044B\u043B\u043E\u043A. \u0421\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F \u0438\u043C\u0451\u043D \u043E\u0442\u043C\u0435\u043D\u044F\u044E\u0442 \u043F\u0435\u0440\u0435\u043D\u043E\u0441.").addText((text) => text.setValue(root).setPlaceholder("_todotracking").onChange((value) => {
      root = value;
    })).addButton((btn) => btn.setButtonText("\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443").onClick(async () => {
      btn.setDisabled(true);
      const previousRoot = this.plugin.settings.root;
      try {
        await this.plugin.store.moveRoot(root);
        try {
          await this.plugin.saveSettings();
        } catch (error) {
          await this.plugin.store.moveRoot(previousRoot);
          throw new Error(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438. \u0424\u0430\u0439\u043B\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B \u0432 ${previousRoot}. ${error instanceof Error ? error.message : String(error)}`);
        }
        new import_obsidian2.Notice(`Smart Todo: \u043F\u0430\u043F\u043A\u0430 ${this.plugin.settings.root}`);
      } catch (error) {
        new import_obsidian2.Notice(error instanceof Error ? error.message : String(error), 9e3);
      } finally {
        btn.setDisabled(false);
      }
    }));
    new import_obsidian2.Setting(container).setName("\u0410\u0432\u0442\u043E\u043F\u0435\u0440\u0435\u043D\u043E\u0441 \u0432 12:00").setDesc("\u0412 \u043F\u043E\u043B\u0434\u0435\u043D\u044C \u043F\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u043F\u0440\u043E\u0448\u0435\u0434\u0448\u0438\u0445 \u0434\u043D\u0435\u0439 \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442 \u043D\u043E\u0432\u0443\u044E \u0434\u0430\u0442\u0443. \u0415\u0441\u043B\u0438 Obsidian \u0431\u044B\u043B \u0437\u0430\u043A\u0440\u044B\u0442, \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043D\u0430\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438. \u0414\u043E \u043F\u043E\u043B\u0443\u0434\u043D\u044F \u0432\u0447\u0435\u0440\u0430\u0448\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F. \u0418\u0441\u0445\u043E\u0434\u043D\u0430\u044F \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0432 \u0438\u0441\u0442\u043E\u0440\u0438\u0438. \u041F\u043B\u0430\u043D\u044B \u043D\u0435\u0434\u0435\u043B\u0438, \u043C\u0435\u0441\u044F\u0446\u0430 \u0438 \u0433\u043E\u0434\u0430 \u043D\u0435 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u044F\u0442\u0441\u044F.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoRollover).onChange(async (value) => {
      this.plugin.settings.autoRollover = value;
      await this.plugin.saveSettings();
      if (value) {
        await this.plugin.store.rollover();
        this.plugin.scheduleRefresh();
      }
    }));
    new import_obsidian2.Setting(container).setName("\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435").setDesc("\u0412 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0412\u0441\u0435\xBB. \u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0413\u043E\u0442\u043E\u0432\u043E\xBB \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0432\u0441\u0435\u0433\u0434\u0430.").addToggle((toggle) => toggle.setValue(this.plugin.settings.showCompleted).onChange(async (value) => {
      this.plugin.settings.showCompleted = value;
      await this.plugin.saveSettings();
    }));
    container.append(el("p", "dl-settings-help", "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 .trash \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432 \u043A\u043E\u0440\u043D\u0435 \u0445\u0440\u0430\u043D\u0438\u043B\u0438\u0449\u0430. \u0423\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438, \u0446\u0435\u043B\u0438 \u0438 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u044E\u0442\u0441\u044F \u0442\u0443\u0434\u0430. Smart Todo \u043D\u0435 \u043E\u0447\u0438\u0449\u0430\u0435\u0442 \u043A\u043E\u0440\u0437\u0438\u043D\u0443 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438; \u0444\u0430\u0439\u043B\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0434\u043E \u0440\u0443\u0447\u043D\u043E\u0433\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F. \u0414\u043B\u044F \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0432\u0435\u0440\u043D\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0432 \u0438\u0441\u0445\u043E\u0434\u043D\u0443\u044E \u043F\u0430\u043F\u043A\u0443 tasks, goals \u0438\u043B\u0438 habits."));
    const help = el("div", "dl-settings-help");
    help.append(el("h3", "", "\u0415\u0441\u043B\u0438 \u0445\u043E\u0442\u0438\u0442\u0435 \u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C Calendar"), el("p", "", "\u0412 Daily notes \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u043D\u0438\u0436\u0435 \u0438 \u0444\u043E\u0440\u043C\u0430\u0442 YYYY-MM-DD. \u0412 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 Calendar \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u043D\u0435\u0434\u0435\u043B\u044C \u0438 \u0444\u043E\u0440\u043C\u0430\u0442 GGGG-[W]WW. \u0422\u043E\u0433\u0434\u0430 \u043E\u0431\u0430 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044F \u0431\u0443\u0434\u0443\u0442 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043E\u0434\u043D\u0438 \u0438 \u0442\u0435 \u0436\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438."));
    const paths2 = el("pre", "", `\u0414\u043D\u0438: ${this.plugin.settings.root}/days
\u041D\u0435\u0434\u0435\u043B\u0438: ${this.plugin.settings.root}/weeks`);
    help.append(paths2, el("p", "", "Calendar \u043F\u043E-\u043F\u0440\u0435\u0436\u043D\u0435\u043C\u0443 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u043E \u0441\u0432\u043E\u0438\u043C \u043F\u0440\u0430\u0432\u0438\u043B\u0430\u043C. \u0412 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435 Smart Todo \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0434\u043D\u044F \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0444\u0430\u0439\u043B\u043E\u0432. \u0421\u0442\u0430\u0440\u044B\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u043C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u0432 \u044D\u0442\u0438 \u043F\u0430\u043F\u043A\u0438 \u0447\u0435\u0440\u0435\u0437 \u0444\u0430\u0439\u043B\u043E\u0432\u044B\u0439 \u043F\u0440\u043E\u0432\u043E\u0434\u043D\u0438\u043A Obsidian \u2014 \u0441\u0441\u044B\u043B\u043A\u0438 \u043E\u0431\u043D\u043E\u0432\u044F\u0442\u0441\u044F \u0448\u0442\u0430\u0442\u043D\u043E."), el("h3", "", "\u0417\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0445 \u0437\u0430\u043C\u0435\u0442\u043E\u043A"), el("p", "", "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u0443 \xABSmart Todo: \u0421\u043E\u0431\u0440\u0430\u0442\u044C \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0438\u0437 \u043E\u0442\u043A\u0440\u044B\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438\xBB. \u041F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0441\u043F\u0438\u0441\u043E\u043A \u0434\u043B\u044F \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u043F\u0435\u0440\u0435\u0434 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435\u043C."));
    container.append(help);
  }
};
