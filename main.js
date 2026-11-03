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
      id: "smart-todos",
      name: "Smart Todo",
      version: "1.0.7",
      minAppVersion: "1.8.0",
      description: "\u041A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u044C, \u043D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438, \u043F\u043B\u0430\u043D\u044B, \u0446\u0435\u043B\u0438 \u0438 \u043F\u0440\u0438\u0432\u044B\u0447\u043A\u0438 \u0432 \u043E\u0431\u044B\u0447\u043D\u044B\u0445 Markdown-\u0444\u0430\u0439\u043B\u0430\u0445.",
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
    const data = { type: entityType("task"), id, title: item.title, status: "open", scheduled: today, scope: "day", priority: "normal", recurrence: "none", goal: "", due: "", created: today, createdAt: store.nextCreationTime(), completed: "", history: [], source, importKey };
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
function recurrenceInterval(value = 1) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C \u043E\u0442 1");
  return value;
}
function nextOccurrence(value, recurrence, interval = 1) {
  recurrenceInterval(interval);
  let next;
  if (recurrence === "monthly" || recurrence === "yearly") {
    const date = parseDate(value);
    const day = date.getDate();
    date.setDate(1);
    if (recurrence === "monthly") date.setMonth(date.getMonth() + interval);
    else date.setFullYear(date.getFullYear() + interval);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
    next = dateKey(date);
  } else {
    next = shiftDay(value, recurrence === "weekly" ? interval * 7 : recurrence === "daily" ? interval : 1);
    while (recurrence === "weekdays" && [0, 6].includes(parseDate(next).getDay())) next = shiftDay(next, 1);
  }
  if (!validDate(next)) throw new Error("\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u043F\u043E\u0432\u0442\u043E\u0440\u0430 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0437\u0430 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0434\u0430\u0442");
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
  const set2 = new Set(completions);
  let count = 0;
  let cursor = today;
  if (!set2.has(cursor)) cursor = shiftDay(cursor, -1);
  const earliest = completions.reduce((min, date) => date < min ? date : min, created);
  while (cursor >= earliest) {
    if (habitDue(days, cursor)) {
      if (!set2.has(cursor)) break;
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

// node_modules/yaml/browser/dist/nodes/identity.js
var ALIAS = Symbol.for("yaml.alias");
var DOC = Symbol.for("yaml.document");
var MAP = Symbol.for("yaml.map");
var PAIR = Symbol.for("yaml.pair");
var SCALAR = Symbol.for("yaml.scalar");
var SEQ = Symbol.for("yaml.seq");
var NODE_TYPE = Symbol.for("yaml.node.type");
var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
function isCollection(node) {
  if (node && typeof node === "object")
    switch (node[NODE_TYPE]) {
      case MAP:
      case SEQ:
        return true;
    }
  return false;
}
function isNode(node) {
  if (node && typeof node === "object")
    switch (node[NODE_TYPE]) {
      case ALIAS:
      case MAP:
      case SCALAR:
      case SEQ:
        return true;
    }
  return false;
}
var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;

// node_modules/yaml/browser/dist/visit.js
var BREAK = Symbol("break visit");
var SKIP = Symbol("skip children");
var REMOVE = Symbol("remove node");
function visit(node, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node)) {
    const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
    if (cd === REMOVE)
      node.contents = null;
  } else
    visit_(null, node, visitor_, Object.freeze([]));
}
visit.BREAK = BREAK;
visit.SKIP = SKIP;
visit.REMOVE = REMOVE;
function visit_(key, node, visitor, path) {
  const ctrl = callVisitor(key, node, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key, path, ctrl);
    return visit_(key, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node)) {
      path = Object.freeze(path.concat(node));
      for (let i = 0; i < node.items.length; ++i) {
        const ci = visit_(i, node.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node)) {
      path = Object.freeze(path.concat(node));
      const ck = visit_("key", node.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node.key = null;
      const cv = visit_("value", node.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node.value = null;
    }
  }
  return ctrl;
}
async function visitAsync(node, visitor) {
  const visitor_ = initVisitor(visitor);
  if (isDocument(node)) {
    const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
    if (cd === REMOVE)
      node.contents = null;
  } else
    await visitAsync_(null, node, visitor_, Object.freeze([]));
}
visitAsync.BREAK = BREAK;
visitAsync.SKIP = SKIP;
visitAsync.REMOVE = REMOVE;
async function visitAsync_(key, node, visitor, path) {
  const ctrl = await callVisitor(key, node, visitor, path);
  if (isNode(ctrl) || isPair(ctrl)) {
    replaceNode(key, path, ctrl);
    return visitAsync_(key, ctrl, visitor, path);
  }
  if (typeof ctrl !== "symbol") {
    if (isCollection(node)) {
      path = Object.freeze(path.concat(node));
      for (let i = 0; i < node.items.length; ++i) {
        const ci = await visitAsync_(i, node.items[i], visitor, path);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK)
          return BREAK;
        else if (ci === REMOVE) {
          node.items.splice(i, 1);
          i -= 1;
        }
      }
    } else if (isPair(node)) {
      path = Object.freeze(path.concat(node));
      const ck = await visitAsync_("key", node.key, visitor, path);
      if (ck === BREAK)
        return BREAK;
      else if (ck === REMOVE)
        node.key = null;
      const cv = await visitAsync_("value", node.value, visitor, path);
      if (cv === BREAK)
        return BREAK;
      else if (cv === REMOVE)
        node.value = null;
    }
  }
  return ctrl;
}
function initVisitor(visitor) {
  if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
    return Object.assign({
      Alias: visitor.Node,
      Map: visitor.Node,
      Scalar: visitor.Node,
      Seq: visitor.Node
    }, visitor.Value && {
      Map: visitor.Value,
      Scalar: visitor.Value,
      Seq: visitor.Value
    }, visitor.Collection && {
      Map: visitor.Collection,
      Seq: visitor.Collection
    }, visitor);
  }
  return visitor;
}
function callVisitor(key, node, visitor, path) {
  var _a, _b, _c, _d, _e;
  if (typeof visitor === "function")
    return visitor(key, node, path);
  if (isMap(node))
    return (_a = visitor.Map) == null ? void 0 : _a.call(visitor, key, node, path);
  if (isSeq(node))
    return (_b = visitor.Seq) == null ? void 0 : _b.call(visitor, key, node, path);
  if (isPair(node))
    return (_c = visitor.Pair) == null ? void 0 : _c.call(visitor, key, node, path);
  if (isScalar(node))
    return (_d = visitor.Scalar) == null ? void 0 : _d.call(visitor, key, node, path);
  if (isAlias(node))
    return (_e = visitor.Alias) == null ? void 0 : _e.call(visitor, key, node, path);
  return void 0;
}
function replaceNode(key, path, node) {
  const parent = path[path.length - 1];
  if (isCollection(parent)) {
    parent.items[key] = node;
  } else if (isPair(parent)) {
    if (key === "key")
      parent.key = node;
    else
      parent.value = node;
  } else if (isDocument(parent)) {
    parent.contents = node;
  } else {
    const pt = isAlias(parent) ? "alias" : "scalar";
    throw new Error(`Cannot replace node with ${pt} parent`);
  }
}

// node_modules/yaml/browser/dist/doc/directives.js
var escapeChars = {
  "!": "%21",
  ",": "%2C",
  "[": "%5B",
  "]": "%5D",
  "{": "%7B",
  "}": "%7D"
};
var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
var Directives = class _Directives {
  constructor(yaml, tags) {
    this.docStart = null;
    this.docEnd = false;
    this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
    this.tags = Object.assign({}, _Directives.defaultTags, tags);
  }
  clone() {
    const copy = new _Directives(this.yaml, this.tags);
    copy.docStart = this.docStart;
    return copy;
  }
  /**
   * During parsing, get a Directives instance for the current document and
   * update the stream state according to the current version's spec.
   */
  atDocument() {
    const res = new _Directives(this.yaml, this.tags);
    switch (this.yaml.version) {
      case "1.1":
        this.atNextDocument = true;
        break;
      case "1.2":
        this.atNextDocument = false;
        this.yaml = {
          explicit: _Directives.defaultYaml.explicit,
          version: "1.2"
        };
        this.tags = Object.assign({}, _Directives.defaultTags);
        break;
    }
    return res;
  }
  /**
   * @param onError - May be called even if the action was successful
   * @returns `true` on success
   */
  add(line, onError) {
    if (this.atNextDocument) {
      this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
      this.tags = Object.assign({}, _Directives.defaultTags);
      this.atNextDocument = false;
    }
    const parts = line.trim().split(/[ \t]+/);
    const name = parts.shift();
    switch (name) {
      case "%TAG": {
        if (parts.length !== 2) {
          onError(0, "%TAG directive should contain exactly two parts");
          if (parts.length < 2)
            return false;
        }
        const [handle, prefix] = parts;
        this.tags[handle] = prefix;
        return true;
      }
      case "%YAML": {
        this.yaml.explicit = true;
        if (parts.length !== 1) {
          onError(0, "%YAML directive should contain exactly one part");
          return false;
        }
        const [version] = parts;
        if (version === "1.1" || version === "1.2") {
          this.yaml.version = version;
          return true;
        } else {
          const isValid = /^\d+\.\d+$/.test(version);
          onError(6, `Unsupported YAML version ${version}`, isValid);
          return false;
        }
      }
      default:
        onError(0, `Unknown directive ${name}`, true);
        return false;
    }
  }
  /**
   * Resolves a tag, matching handles to those defined in %TAG directives.
   *
   * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
   *   `'!local'` tag, or `null` if unresolvable.
   */
  tagName(source, onError) {
    if (source === "!")
      return "!";
    if (source[0] !== "!") {
      onError(`Not a valid tag: ${source}`);
      return null;
    }
    if (source[1] === "<") {
      const verbatim = source.slice(2, -1);
      if (verbatim === "!" || verbatim === "!!") {
        onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
        return null;
      }
      if (source[source.length - 1] !== ">")
        onError("Verbatim tags must end with a >");
      return verbatim;
    }
    const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
    if (!suffix)
      onError(`The ${source} tag has no suffix`);
    const prefix = this.tags[handle];
    if (prefix) {
      try {
        return prefix + decodeURIComponent(suffix);
      } catch (error) {
        onError(String(error));
        return null;
      }
    }
    if (handle === "!")
      return source;
    onError(`Could not resolve tag: ${source}`);
    return null;
  }
  /**
   * Given a fully resolved tag, returns its printable string form,
   * taking into account current tag prefixes and defaults.
   */
  tagString(tag) {
    for (const [handle, prefix] of Object.entries(this.tags)) {
      if (tag.startsWith(prefix))
        return handle + escapeTagName(tag.substring(prefix.length));
    }
    return tag[0] === "!" ? tag : `!<${tag}>`;
  }
  toString(doc) {
    const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
    const tagEntries = Object.entries(this.tags);
    let tagNames;
    if (doc && tagEntries.length > 0 && isNode(doc.contents)) {
      const tags = {};
      visit(doc.contents, (_key, node) => {
        if (isNode(node) && node.tag)
          tags[node.tag] = true;
      });
      tagNames = Object.keys(tags);
    } else
      tagNames = [];
    for (const [handle, prefix] of tagEntries) {
      if (handle === "!!" && prefix === "tag:yaml.org,2002:")
        continue;
      if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
        lines.push(`%TAG ${handle} ${prefix}`);
    }
    return lines.join("\n");
  }
};
Directives.defaultYaml = { explicit: false, version: "1.2" };
Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };

// node_modules/yaml/browser/dist/doc/anchors.js
function anchorIsValid(anchor) {
  if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
    const sa = JSON.stringify(anchor);
    const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
    throw new Error(msg);
  }
  return true;
}
function anchorNames(root) {
  const anchors = /* @__PURE__ */ new Set();
  visit(root, {
    Value(_key, node) {
      if (node.anchor)
        anchors.add(node.anchor);
    }
  });
  return anchors;
}
function findNewAnchor(prefix, exclude) {
  for (let i = 1; true; ++i) {
    const name = `${prefix}${i}`;
    if (!exclude.has(name))
      return name;
  }
}
function createNodeAnchors(doc, prefix) {
  const aliasObjects = [];
  const sourceObjects = /* @__PURE__ */ new Map();
  let prevAnchors = null;
  return {
    onAnchor: (source) => {
      aliasObjects.push(source);
      prevAnchors != null ? prevAnchors : prevAnchors = anchorNames(doc);
      const anchor = findNewAnchor(prefix, prevAnchors);
      prevAnchors.add(anchor);
      return anchor;
    },
    /**
     * With circular references, the source node is only resolved after all
     * of its child nodes are. This is why anchors are set only after all of
     * the nodes have been created.
     */
    setAnchors: () => {
      for (const source of aliasObjects) {
        const ref = sourceObjects.get(source);
        if (typeof ref === "object" && ref.anchor && (isScalar(ref.node) || isCollection(ref.node))) {
          ref.node.anchor = ref.anchor;
        } else {
          const error = new Error("Failed to resolve repeated object (this should not happen)");
          error.source = source;
          throw error;
        }
      }
    },
    sourceObjects
  };
}

// node_modules/yaml/browser/dist/doc/applyReviver.js
function applyReviver(reviver, obj, key, val) {
  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      for (let i = 0, len = val.length; i < len; ++i) {
        const v0 = val[i];
        const v1 = applyReviver(reviver, val, String(i), v0);
        if (v1 === void 0)
          delete val[i];
        else if (v1 !== v0)
          val[i] = v1;
      }
    } else if (val instanceof Map) {
      for (const k of Array.from(val.keys())) {
        const v0 = val.get(k);
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          val.delete(k);
        else if (v1 !== v0)
          val.set(k, v1);
      }
    } else if (val instanceof Set) {
      for (const v0 of Array.from(val)) {
        const v1 = applyReviver(reviver, val, v0, v0);
        if (v1 === void 0)
          val.delete(v0);
        else if (v1 !== v0) {
          val.delete(v0);
          val.add(v1);
        }
      }
    } else {
      for (const [k, v0] of Object.entries(val)) {
        const v1 = applyReviver(reviver, val, k, v0);
        if (v1 === void 0)
          delete val[k];
        else if (v1 !== v0)
          val[k] = v1;
      }
    }
  }
  return reviver.call(obj, key, val);
}

// node_modules/yaml/browser/dist/nodes/toJS.js
function toJS(value, arg, ctx) {
  if (Array.isArray(value))
    return value.map((v, i) => toJS(v, String(i), ctx));
  if (value && typeof value.toJSON === "function") {
    if (!ctx || !hasAnchor(value))
      return value.toJSON(arg, ctx);
    const data = { aliasCount: 0, count: 1, res: void 0 };
    ctx.anchors.set(value, data);
    ctx.onCreate = (res2) => {
      data.res = res2;
      delete ctx.onCreate;
    };
    const res = value.toJSON(arg, ctx);
    if (ctx.onCreate)
      ctx.onCreate(res);
    return res;
  }
  if (typeof value === "bigint" && !(ctx == null ? void 0 : ctx.keep))
    return Number(value);
  return value;
}

// node_modules/yaml/browser/dist/nodes/Node.js
var NodeBase = class {
  constructor(type) {
    Object.defineProperty(this, NODE_TYPE, { value: type });
  }
  /** Create a copy of this node.  */
  clone() {
    const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /** A plain JavaScript representation of this node. */
  toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
    if (!isDocument(doc))
      throw new TypeError("A document argument is required");
    const ctx = {
      anchors: /* @__PURE__ */ new Map(),
      doc,
      keep: true,
      mapAsMap: mapAsMap === true,
      mapKeyWarned: false,
      maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
    };
    const res = toJS(this, "", ctx);
    if (typeof onAnchor === "function")
      for (const { count, res: res2 } of ctx.anchors.values())
        onAnchor(res2, count);
    return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
  }
};

// node_modules/yaml/browser/dist/nodes/Alias.js
var Alias = class extends NodeBase {
  constructor(source) {
    super(ALIAS);
    this.source = source;
    Object.defineProperty(this, "tag", {
      set() {
        throw new Error("Alias nodes cannot have tags");
      }
    });
  }
  /**
   * Resolve the value of this alias within `doc`, finding the last
   * instance of the `source` anchor before this node.
   */
  resolve(doc, ctx) {
    if ((ctx == null ? void 0 : ctx.maxAliasCount) === 0)
      throw new ReferenceError("Alias resolution is disabled");
    let nodes;
    if (ctx == null ? void 0 : ctx.aliasResolveCache) {
      nodes = ctx.aliasResolveCache;
    } else {
      nodes = [];
      visit(doc, {
        Node: (_key, node) => {
          if (isAlias(node) || hasAnchor(node))
            nodes.push(node);
        }
      });
      if (ctx)
        ctx.aliasResolveCache = nodes;
    }
    let found = void 0;
    for (const node of nodes) {
      if (node === this)
        break;
      if (node.anchor === this.source)
        found = node;
    }
    if (found && ctx) {
      const { anchors, doc: doc2, maxAliasCount } = ctx;
      let data = anchors.get(found);
      if (!data) {
        toJS(found, null, ctx);
        data = anchors.get(found);
      }
      if ((data == null ? void 0 : data.res) === void 0) {
        const msg = "This should not happen: Alias anchor was not resolved?";
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc2, found, anchors);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
    }
    return found;
  }
  toJSON(_arg, ctx) {
    if (!ctx)
      return { source: this.source };
    const source = this.resolve(ctx.doc, ctx);
    if (!source) {
      const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
      throw new ReferenceError(msg);
    }
    return ctx.anchors.get(source).res;
  }
  toString(ctx, _onComment, _onChompKeep) {
    const src = `*${this.source}`;
    if (ctx) {
      anchorIsValid(this.source);
      if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new Error(msg);
      }
      if (ctx.implicitKey)
        return `${src} `;
    }
    return src;
  }
};
function getAliasCount(doc, node, anchors) {
  if (isAlias(node)) {
    const source = node.resolve(doc);
    const anchor = anchors && source && anchors.get(source);
    return anchor ? anchor.count * anchor.aliasCount : 0;
  } else if (isCollection(node)) {
    let count = 0;
    for (const item of node.items) {
      const c = getAliasCount(doc, item, anchors);
      if (c > count)
        count = c;
    }
    return count;
  } else if (isPair(node)) {
    const kc = getAliasCount(doc, node.key, anchors);
    const vc = getAliasCount(doc, node.value, anchors);
    return Math.max(kc, vc);
  }
  return 1;
}

// node_modules/yaml/browser/dist/nodes/Scalar.js
var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
var Scalar = class extends NodeBase {
  constructor(value) {
    super(SCALAR);
    this.value = value;
  }
  toJSON(arg, ctx) {
    return (ctx == null ? void 0 : ctx.keep) ? this.value : toJS(this.value, arg, ctx);
  }
  toString() {
    return String(this.value);
  }
};
Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
Scalar.PLAIN = "PLAIN";
Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";

// node_modules/yaml/browser/dist/doc/createNode.js
var defaultTagPrefix = "tag:yaml.org,2002:";
function findTagObject(value, tagName, tags) {
  var _a;
  if (tagName) {
    const match = tags.filter((t) => t.tag === tagName);
    const tagObj = (_a = match.find((t) => !t.format)) != null ? _a : match[0];
    if (!tagObj)
      throw new Error(`Tag ${tagName} not found`);
    return tagObj;
  }
  return tags.find((t) => {
    var _a2;
    return ((_a2 = t.identify) == null ? void 0 : _a2.call(t, value)) && !t.format;
  });
}
function createNode(value, tagName, ctx) {
  var _a, _b, _c, _d;
  if (isDocument(value))
    value = value.contents;
  if (isNode(value))
    return value;
  if (isPair(value)) {
    const map2 = (_b = (_a = ctx.schema[MAP]).createNode) == null ? void 0 : _b.call(_a, ctx.schema, null, ctx);
    map2.items.push(value);
    return map2;
  }
  if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
    value = value.valueOf();
  }
  const { aliasDuplicateObjects, onAnchor, onTagObj, schema: schema4, sourceObjects } = ctx;
  let ref = void 0;
  if (aliasDuplicateObjects && value && typeof value === "object") {
    ref = sourceObjects.get(value);
    if (ref) {
      (_c = ref.anchor) != null ? _c : ref.anchor = onAnchor(value);
      return new Alias(ref.anchor);
    } else {
      ref = { anchor: null, node: null };
      sourceObjects.set(value, ref);
    }
  }
  if (tagName == null ? void 0 : tagName.startsWith("!!"))
    tagName = defaultTagPrefix + tagName.slice(2);
  let tagObj = findTagObject(value, tagName, schema4.tags);
  if (!tagObj) {
    if (value && typeof value.toJSON === "function") {
      value = value.toJSON();
    }
    if (!value || typeof value !== "object") {
      const node2 = new Scalar(value);
      if (ref)
        ref.node = node2;
      return node2;
    }
    tagObj = value instanceof Map ? schema4[MAP] : Symbol.iterator in Object(value) ? schema4[SEQ] : schema4[MAP];
  }
  if (onTagObj) {
    onTagObj(tagObj);
    delete ctx.onTagObj;
  }
  const node = (tagObj == null ? void 0 : tagObj.createNode) ? tagObj.createNode(ctx.schema, value, ctx) : typeof ((_d = tagObj == null ? void 0 : tagObj.nodeClass) == null ? void 0 : _d.from) === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar(value);
  if (tagName)
    node.tag = tagName;
  else if (!tagObj.default)
    node.tag = tagObj.tag;
  if (ref)
    ref.node = node;
  return node;
}

// node_modules/yaml/browser/dist/nodes/Collection.js
function collectionFromPath(schema4, path, value) {
  let v = value;
  for (let i = path.length - 1; i >= 0; --i) {
    const k = path[i];
    if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
      const a = [];
      a[k] = v;
      v = a;
    } else {
      v = /* @__PURE__ */ new Map([[k, v]]);
    }
  }
  return createNode(v, void 0, {
    aliasDuplicateObjects: false,
    keepUndefined: false,
    onAnchor: () => {
      throw new Error("This should not happen, please report a bug.");
    },
    schema: schema4,
    sourceObjects: /* @__PURE__ */ new Map()
  });
}
var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
var Collection = class extends NodeBase {
  constructor(type, schema4) {
    super(type);
    Object.defineProperty(this, "schema", {
      value: schema4,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  /**
   * Create a copy of this collection.
   *
   * @param schema - If defined, overwrites the original's schema
   */
  clone(schema4) {
    const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
    if (schema4)
      copy.schema = schema4;
    copy.items = copy.items.map((it) => isNode(it) || isPair(it) ? it.clone(schema4) : it);
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /**
   * Adds a value to the collection. For `!!map` and `!!omap` the value must
   * be a Pair instance or a `{ key, value }` object, which may not have a key
   * that already exists in the map.
   */
  addIn(path, value) {
    if (isEmptyPath(path))
      this.add(value);
    else {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (isCollection(node))
        node.addIn(rest, value);
      else if (node === void 0 && this.schema)
        this.set(key, collectionFromPath(this.schema, rest, value));
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }
  /**
   * Removes a value from the collection.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(path) {
    const [key, ...rest] = path;
    if (rest.length === 0)
      return this.delete(key);
    const node = this.get(key, true);
    if (isCollection(node))
      return node.deleteIn(rest);
    else
      throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(path, keepScalar) {
    const [key, ...rest] = path;
    const node = this.get(key, true);
    if (rest.length === 0)
      return !keepScalar && isScalar(node) ? node.value : node;
    else
      return isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
  }
  hasAllNullValues(allowScalar) {
    return this.items.every((node) => {
      if (!isPair(node))
        return false;
      const n = node.value;
      return n == null || allowScalar && isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
    });
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   */
  hasIn(path) {
    const [key, ...rest] = path;
    if (rest.length === 0)
      return this.has(key);
    const node = this.get(key, true);
    return isCollection(node) ? node.hasIn(rest) : false;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(path, value) {
    const [key, ...rest] = path;
    if (rest.length === 0) {
      this.set(key, value);
    } else {
      const node = this.get(key, true);
      if (isCollection(node))
        node.setIn(rest, value);
      else if (node === void 0 && this.schema)
        this.set(key, collectionFromPath(this.schema, rest, value));
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyComment.js
var stringifyComment = (str2) => str2.replace(/^(?!$)(?: $)?/gm, "#");
function indentComment(comment, indent) {
  if (/^\n+$/.test(comment))
    return comment.substring(1);
  return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
}
var lineComment = (str2, indent, comment) => str2.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str2.endsWith(" ") ? "" : " ") + comment;

// node_modules/yaml/browser/dist/stringify/foldFlowLines.js
var FOLD_FLOW = "flow";
var FOLD_BLOCK = "block";
var FOLD_QUOTED = "quoted";
function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
  if (!lineWidth || lineWidth < 0)
    return text;
  if (lineWidth < minContentWidth)
    minContentWidth = 0;
  const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
  if (text.length <= endStep)
    return text;
  const folds = [];
  const escapedFolds = {};
  let end = lineWidth - indent.length;
  if (typeof indentAtStart === "number") {
    if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
      folds.push(0);
    else
      end = lineWidth - indentAtStart;
  }
  let split = void 0;
  let prev = void 0;
  let overflow = false;
  let i = -1;
  let escStart = -1;
  let escEnd = -1;
  if (mode === FOLD_BLOCK) {
    i = consumeMoreIndentedLines(text, i, indent.length);
    if (i !== -1)
      end = i + endStep;
  }
  for (let ch; ch = text[i += 1]; ) {
    if (mode === FOLD_QUOTED && ch === "\\") {
      escStart = i;
      switch (text[i + 1]) {
        case "x":
          i += 3;
          break;
        case "u":
          i += 5;
          break;
        case "U":
          i += 9;
          break;
        default:
          i += 1;
      }
      escEnd = i;
    }
    if (ch === "\n") {
      if (mode === FOLD_BLOCK)
        i = consumeMoreIndentedLines(text, i, indent.length);
      end = i + indent.length + endStep;
      split = void 0;
    } else {
      if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
        const next = text[i + 1];
        if (next && next !== " " && next !== "\n" && next !== "	")
          split = i;
      }
      if (i >= end) {
        if (split) {
          folds.push(split);
          end = split + endStep;
          split = void 0;
        } else if (mode === FOLD_QUOTED) {
          while (prev === " " || prev === "	") {
            prev = ch;
            ch = text[i += 1];
            overflow = true;
          }
          const j = i > escEnd + 1 ? i - 2 : escStart - 1;
          if (escapedFolds[j])
            return text;
          folds.push(j);
          escapedFolds[j] = true;
          end = j + endStep;
          split = void 0;
        } else {
          overflow = true;
        }
      }
    }
    prev = ch;
  }
  if (overflow && onOverflow)
    onOverflow();
  if (folds.length === 0)
    return text;
  if (onFold)
    onFold();
  let res = text.slice(0, folds[0]);
  for (let i2 = 0; i2 < folds.length; ++i2) {
    const fold = folds[i2];
    const end2 = folds[i2 + 1] || text.length;
    if (fold === 0)
      res = `
${indent}${text.slice(0, end2)}`;
    else {
      if (mode === FOLD_QUOTED && escapedFolds[fold])
        res += `${text[fold]}\\`;
      res += `
${indent}${text.slice(fold + 1, end2)}`;
    }
  }
  return res;
}
function consumeMoreIndentedLines(text, i, indent) {
  let end = i;
  let start = i + 1;
  let ch = text[start];
  while (ch === " " || ch === "	") {
    if (i < start + indent) {
      ch = text[++i];
    } else {
      do {
        ch = text[++i];
      } while (ch && ch !== "\n");
      end = i;
      start = i + 1;
      ch = text[start];
    }
  }
  return end;
}

// node_modules/yaml/browser/dist/stringify/stringifyString.js
var getFoldOptions = (ctx, isBlock2) => ({
  indentAtStart: isBlock2 ? ctx.indent.length : ctx.indentAtStart,
  lineWidth: ctx.options.lineWidth,
  minContentWidth: ctx.options.minContentWidth
});
var containsDocumentMarker = (str2) => /^(%|---|\.\.\.)/m.test(str2);
function lineLengthOverLimit(str2, lineWidth, indentLength) {
  if (!lineWidth || lineWidth < 0)
    return false;
  const limit = lineWidth - indentLength;
  const strLen = str2.length;
  if (strLen <= limit)
    return false;
  for (let i = 0, start = 0; i < strLen; ++i) {
    if (str2[i] === "\n") {
      if (i - start > limit)
        return true;
      start = i + 1;
      if (strLen - start <= limit)
        return false;
    }
  }
  return true;
}
function doubleQuotedString(value, ctx) {
  const json = JSON.stringify(value);
  if (ctx.options.doubleQuotedAsJSON)
    return json;
  const { implicitKey } = ctx;
  const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  let str2 = "";
  let start = 0;
  for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
    if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
      str2 += json.slice(start, i) + "\\ ";
      i += 1;
      start = i;
      ch = "\\";
    }
    if (ch === "\\")
      switch (json[i + 1]) {
        case "u":
          {
            str2 += json.slice(start, i);
            const code = json.substr(i + 2, 4);
            switch (code) {
              case "0000":
                str2 += "\\0";
                break;
              case "0007":
                str2 += "\\a";
                break;
              case "000b":
                str2 += "\\v";
                break;
              case "001b":
                str2 += "\\e";
                break;
              case "0085":
                str2 += "\\N";
                break;
              case "00a0":
                str2 += "\\_";
                break;
              case "2028":
                str2 += "\\L";
                break;
              case "2029":
                str2 += "\\P";
                break;
              default:
                if (code.substr(0, 2) === "00")
                  str2 += "\\x" + code.substr(2);
                else
                  str2 += json.substr(i, 6);
            }
            i += 5;
            start = i + 1;
          }
          break;
        case "n":
          if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
            i += 1;
          } else {
            str2 += json.slice(start, i) + "\n\n";
            while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
              str2 += "\n";
              i += 2;
            }
            str2 += indent;
            if (json[i + 2] === " ")
              str2 += "\\";
            i += 1;
            start = i + 1;
          }
          break;
        default:
          i += 1;
      }
  }
  str2 = start ? str2 + json.slice(start) : json;
  return implicitKey ? str2 : foldFlowLines(str2, indent, FOLD_QUOTED, getFoldOptions(ctx, false));
}
function singleQuotedString(value, ctx) {
  if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
    return doubleQuotedString(value, ctx);
  const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
  const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
  return ctx.implicitKey ? res : foldFlowLines(res, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function quotedString(value, ctx) {
  const { singleQuote } = ctx.options;
  let qs;
  if (singleQuote === false)
    qs = doubleQuotedString;
  else {
    const hasDouble = value.includes('"');
    const hasSingle = value.includes("'");
    if (hasDouble && !hasSingle)
      qs = singleQuotedString;
    else if (hasSingle && !hasDouble)
      qs = doubleQuotedString;
    else
      qs = singleQuote ? singleQuotedString : doubleQuotedString;
  }
  return qs(value, ctx);
}
var blockEndNewlines;
try {
  blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
} catch (e) {
  blockEndNewlines = /\n+(?!\n|$)/g;
}
function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
  const { blockQuote, commentString, lineWidth } = ctx.options;
  if (!blockQuote || /\n[\t ]+$/.test(value)) {
    return quotedString(value, ctx);
  }
  const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
  const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.BLOCK_FOLDED ? false : type === Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
  if (!value)
    return literal ? "|\n" : ">\n";
  let chomp;
  let endStart;
  for (endStart = value.length; endStart > 0; --endStart) {
    const ch = value[endStart - 1];
    if (ch !== "\n" && ch !== "	" && ch !== " ")
      break;
  }
  let end = value.substring(endStart);
  const endNlPos = end.indexOf("\n");
  if (endNlPos === -1) {
    chomp = "-";
  } else if (value === end || endNlPos !== end.length - 1) {
    chomp = "+";
    if (onChompKeep)
      onChompKeep();
  } else {
    chomp = "";
  }
  if (end) {
    value = value.slice(0, -end.length);
    if (end[end.length - 1] === "\n")
      end = end.slice(0, -1);
    end = end.replace(blockEndNewlines, `$&${indent}`);
  }
  let startWithSpace = false;
  let startEnd;
  let startNlPos = -1;
  for (startEnd = 0; startEnd < value.length; ++startEnd) {
    const ch = value[startEnd];
    if (ch === " ")
      startWithSpace = true;
    else if (ch === "\n")
      startNlPos = startEnd;
    else
      break;
  }
  let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
  if (start) {
    value = value.substring(start.length);
    start = start.replace(/\n+/g, `$&${indent}`);
  }
  const indentSize = indent ? "2" : "1";
  let header = (startWithSpace ? indentSize : "") + chomp;
  if (comment) {
    header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
    if (onComment)
      onComment();
  }
  if (!literal) {
    const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
    let literalFallback = false;
    const foldOptions = getFoldOptions(ctx, true);
    if (blockQuote !== "folded" && type !== Scalar.BLOCK_FOLDED) {
      foldOptions.onOverflow = () => {
        literalFallback = true;
      };
    }
    const body = foldFlowLines(`${start}${foldedValue}${end}`, indent, FOLD_BLOCK, foldOptions);
    if (!literalFallback)
      return `>${header}
${indent}${body}`;
  }
  value = value.replace(/\n+/g, `$&${indent}`);
  return `|${header}
${indent}${start}${value}${end}`;
}
function plainString(item, ctx, onComment, onChompKeep) {
  const { type, value } = item;
  const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
  if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
    return quotedString(value, ctx);
  }
  if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
    return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
  }
  if (!implicitKey && !inFlow && type !== Scalar.PLAIN && value.includes("\n")) {
    return blockString(item, ctx, onComment, onChompKeep);
  }
  if (containsDocumentMarker(value)) {
    if (indent === "") {
      ctx.forceBlockIndent = true;
      return blockString(item, ctx, onComment, onChompKeep);
    } else if (implicitKey && indent === indentStep) {
      return quotedString(value, ctx);
    }
  }
  const str2 = value.replace(/\n+/g, `$&
${indent}`);
  if (actualString) {
    const test = (tag) => {
      var _a;
      return tag.default && tag.tag !== "tag:yaml.org,2002:str" && ((_a = tag.test) == null ? void 0 : _a.test(str2));
    };
    const { compat, tags } = ctx.doc.schema;
    if (tags.some(test) || (compat == null ? void 0 : compat.some(test)))
      return quotedString(value, ctx);
  }
  return implicitKey ? str2 : foldFlowLines(str2, indent, FOLD_FLOW, getFoldOptions(ctx, false));
}
function stringifyString(item, ctx, onComment, onChompKeep) {
  const { implicitKey, inFlow } = ctx;
  const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
  let { type } = item;
  if (type !== Scalar.QUOTE_DOUBLE) {
    if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
      type = Scalar.QUOTE_DOUBLE;
  }
  const _stringify = (_type) => {
    switch (_type) {
      case Scalar.BLOCK_FOLDED:
      case Scalar.BLOCK_LITERAL:
        return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
      case Scalar.QUOTE_DOUBLE:
        return doubleQuotedString(ss.value, ctx);
      case Scalar.QUOTE_SINGLE:
        return singleQuotedString(ss.value, ctx);
      case Scalar.PLAIN:
        return plainString(ss, ctx, onComment, onChompKeep);
      default:
        return null;
    }
  };
  let res = _stringify(type);
  if (res === null) {
    const { defaultKeyType, defaultStringType } = ctx.options;
    const t = implicitKey && defaultKeyType || defaultStringType;
    res = _stringify(t);
    if (res === null)
      throw new Error(`Unsupported default string type ${t}`);
  }
  return res;
}

// node_modules/yaml/browser/dist/stringify/stringify.js
function createStringifyContext(doc, options) {
  const opt = Object.assign({
    blockQuote: true,
    commentString: stringifyComment,
    defaultKeyType: null,
    defaultStringType: "PLAIN",
    directives: null,
    doubleQuotedAsJSON: false,
    doubleQuotedMinMultiLineLength: 40,
    falseStr: "false",
    flowCollectionPadding: true,
    indentSeq: true,
    lineWidth: 80,
    minContentWidth: 20,
    nullStr: "null",
    simpleKeys: false,
    singleQuote: null,
    trailingComma: false,
    trueStr: "true",
    verifyAliasOrder: true
  }, doc.schema.toStringOptions, options);
  let inFlow;
  switch (opt.collectionStyle) {
    case "block":
      inFlow = false;
      break;
    case "flow":
      inFlow = true;
      break;
    default:
      inFlow = null;
  }
  return {
    anchors: /* @__PURE__ */ new Set(),
    doc,
    flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
    indent: "",
    indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
    inFlow,
    options: opt
  };
}
function getTagObject(tags, item) {
  var _a, _b, _c, _d;
  if (item.tag) {
    const match = tags.filter((t) => t.tag === item.tag);
    if (match.length > 0)
      return (_a = match.find((t) => t.format === item.format)) != null ? _a : match[0];
  }
  let tagObj = void 0;
  let obj;
  if (isScalar(item)) {
    obj = item.value;
    let match = tags.filter((t) => {
      var _a2;
      return (_a2 = t.identify) == null ? void 0 : _a2.call(t, obj);
    });
    if (match.length > 1) {
      const testMatch = match.filter((t) => t.test);
      if (testMatch.length > 0)
        match = testMatch;
    }
    tagObj = (_b = match.find((t) => t.format === item.format)) != null ? _b : match.find((t) => !t.format);
  } else {
    obj = item;
    tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
  }
  if (!tagObj) {
    const name = (_d = (_c = obj == null ? void 0 : obj.constructor) == null ? void 0 : _c.name) != null ? _d : obj === null ? "null" : typeof obj;
    throw new Error(`Tag not resolved for ${name} value`);
  }
  return tagObj;
}
function stringifyProps(node, tagObj, { anchors, doc }) {
  var _a;
  if (!doc.directives)
    return "";
  const props = [];
  const anchor = (isScalar(node) || isCollection(node)) && node.anchor;
  if (anchor && anchorIsValid(anchor)) {
    anchors.add(anchor);
    props.push(`&${anchor}`);
  }
  const tag = (_a = node.tag) != null ? _a : tagObj.default ? null : tagObj.tag;
  if (tag)
    props.push(doc.directives.tagString(tag));
  return props.join(" ");
}
function stringify(item, ctx, onComment, onChompKeep) {
  var _a, _b;
  if (isPair(item))
    return item.toString(ctx, onComment, onChompKeep);
  if (isAlias(item)) {
    if (ctx.doc.directives)
      return item.toString(ctx);
    if ((_a = ctx.resolvedAliases) == null ? void 0 : _a.has(item)) {
      throw new TypeError(`Cannot stringify circular structure without alias nodes`);
    } else {
      if (ctx.resolvedAliases)
        ctx.resolvedAliases.add(item);
      else
        ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
      item = item.resolve(ctx.doc);
    }
  }
  let tagObj = void 0;
  const node = isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
  tagObj != null ? tagObj : tagObj = getTagObject(ctx.doc.schema.tags, node);
  const props = stringifyProps(node, tagObj, ctx);
  if (props.length > 0)
    ctx.indentAtStart = ((_b = ctx.indentAtStart) != null ? _b : 0) + props.length + 1;
  const str2 = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : isScalar(node) ? stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
  if (!props)
    return str2;
  return isScalar(node) || str2[0] === "{" || str2[0] === "[" ? `${props} ${str2}` : `${props}
${ctx.indent}${str2}`;
}

// node_modules/yaml/browser/dist/stringify/stringifyPair.js
function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
  var _a, _b;
  const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
  let keyComment = isNode(key) && key.comment || null;
  if (simpleKeys) {
    if (keyComment) {
      throw new Error("With simple keys, key nodes cannot have comments");
    }
    if (isCollection(key) || !isNode(key) && typeof key === "object") {
      const msg = "With simple keys, collection cannot be used as a key value";
      throw new Error(msg);
    }
  }
  let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || isCollection(key) || (isScalar(key) ? key.type === Scalar.BLOCK_FOLDED || key.type === Scalar.BLOCK_LITERAL : typeof key === "object"));
  ctx = Object.assign({}, ctx, {
    allNullValues: false,
    implicitKey: !explicitKey && (simpleKeys || !allNullValues),
    indent: indent + indentStep
  });
  let keyCommentDone = false;
  let chompKeep = false;
  let str2 = stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
  if (!explicitKey && !ctx.inFlow && str2.length > 1024) {
    if (simpleKeys)
      throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
    explicitKey = true;
  }
  if (ctx.inFlow) {
    if (allNullValues || value == null) {
      if (keyCommentDone && onComment)
        onComment();
      return str2 === "" ? "?" : explicitKey ? `? ${str2}` : str2;
    }
  } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
    str2 = `? ${str2}`;
    if (keyComment && !keyCommentDone) {
      str2 += lineComment(str2, ctx.indent, commentString(keyComment));
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str2;
  }
  if (keyCommentDone)
    keyComment = null;
  if (explicitKey) {
    if (keyComment)
      str2 += lineComment(str2, ctx.indent, commentString(keyComment));
    str2 = `? ${str2}
${indent}:`;
  } else {
    str2 = `${str2}:`;
    if (keyComment)
      str2 += lineComment(str2, ctx.indent, commentString(keyComment));
  }
  let vsb, vcb, valueComment;
  if (isNode(value)) {
    vsb = !!value.spaceBefore;
    vcb = value.commentBefore;
    valueComment = value.comment;
  } else {
    vsb = false;
    vcb = null;
    valueComment = null;
    if (value && typeof value === "object")
      value = doc.createNode(value);
  }
  ctx.implicitKey = false;
  if (!explicitKey && !keyComment && isScalar(value))
    ctx.indentAtStart = str2.length + 1;
  chompKeep = false;
  if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && isSeq(value) && !value.flow && !value.tag && !value.anchor) {
    ctx.indent = ctx.indent.substring(2);
  }
  let valueCommentDone = false;
  const valueStr = stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
  let ws = " ";
  if (keyComment || vsb || vcb) {
    ws = vsb ? "\n" : "";
    if (vcb) {
      const cs = commentString(vcb);
      ws += `
${indentComment(cs, ctx.indent)}`;
    }
    if (valueStr === "" && !ctx.inFlow) {
      if (ws === "\n" && valueComment)
        ws = "\n\n";
    } else {
      ws += `
${ctx.indent}`;
    }
  } else if (!explicitKey && isCollection(value)) {
    const vs0 = valueStr[0];
    const nl0 = valueStr.indexOf("\n");
    const hasNewline = nl0 !== -1;
    const flow = (_b = (_a = ctx.inFlow) != null ? _a : value.flow) != null ? _b : value.items.length === 0;
    if (hasNewline || !flow) {
      let hasPropsLine = false;
      if (hasNewline && (vs0 === "&" || vs0 === "!")) {
        let sp0 = valueStr.indexOf(" ");
        if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
          sp0 = valueStr.indexOf(" ", sp0 + 1);
        }
        if (sp0 === -1 || nl0 < sp0)
          hasPropsLine = true;
      }
      if (!hasPropsLine)
        ws = `
${ctx.indent}`;
    }
  } else if (valueStr === "" || valueStr[0] === "\n") {
    ws = "";
  }
  str2 += ws + valueStr;
  if (ctx.inFlow) {
    if (valueCommentDone && onComment)
      onComment();
  } else if (valueComment && !valueCommentDone) {
    str2 += lineComment(str2, ctx.indent, commentString(valueComment));
  } else if (chompKeep && onChompKeep) {
    onChompKeep();
  }
  return str2;
}

// node_modules/yaml/browser/dist/log.js
function warn(logLevel, warning) {
  if (logLevel === "debug" || logLevel === "warn") {
    console.warn(warning);
  }
}

// node_modules/yaml/browser/dist/schema/yaml-1.1/merge.js
var MERGE_KEY = "<<";
var merge = {
  identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
  default: "key",
  tag: "tag:yaml.org,2002:merge",
  test: /^<<$/,
  resolve: () => Object.assign(new Scalar(Symbol(MERGE_KEY)), {
    addToJSMap: addMergeToJSMap
  }),
  stringify: () => MERGE_KEY
};
var isMergeKey = (ctx, key) => (merge.identify(key) || isScalar(key) && (!key.type || key.type === Scalar.PLAIN) && merge.identify(key.value)) && (ctx == null ? void 0 : ctx.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default));
function addMergeToJSMap(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (isSeq(source))
    for (const it of source.items)
      mergeValue(ctx, map2, it);
  else if (Array.isArray(source))
    for (const it of source)
      mergeValue(ctx, map2, it);
  else
    mergeValue(ctx, map2, source);
}
function mergeValue(ctx, map2, value) {
  const source = resolveAliasValue(ctx, value);
  if (!isMap(source))
    throw new Error("Merge sources must be maps or map aliases");
  const srcMap = source.toJSON(null, ctx, Map);
  for (const [key, value2] of srcMap) {
    if (map2 instanceof Map) {
      if (!map2.has(key))
        map2.set(key, value2);
    } else if (map2 instanceof Set) {
      map2.add(key);
    } else if (!Object.prototype.hasOwnProperty.call(map2, key)) {
      Object.defineProperty(map2, key, {
        value: value2,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }
  return map2;
}
function resolveAliasValue(ctx, value) {
  return ctx && isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
}

// node_modules/yaml/browser/dist/nodes/addPairToJSMap.js
function addPairToJSMap(ctx, map2, { key, value }) {
  if (isNode(key) && key.addToJSMap)
    key.addToJSMap(ctx, map2, value);
  else if (isMergeKey(ctx, key))
    addMergeToJSMap(ctx, map2, value);
  else {
    const jsKey = toJS(key, "", ctx);
    if (map2 instanceof Map) {
      map2.set(jsKey, toJS(value, jsKey, ctx));
    } else if (map2 instanceof Set) {
      map2.add(jsKey);
    } else {
      const stringKey = stringifyKey(key, jsKey, ctx);
      const jsValue = toJS(value, stringKey, ctx);
      if (stringKey in map2)
        Object.defineProperty(map2, stringKey, {
          value: jsValue,
          writable: true,
          enumerable: true,
          configurable: true
        });
      else
        map2[stringKey] = jsValue;
    }
  }
  return map2;
}
function stringifyKey(key, jsKey, ctx) {
  if (jsKey === null)
    return "";
  if (typeof jsKey !== "object")
    return String(jsKey);
  if (isNode(key) && (ctx == null ? void 0 : ctx.doc)) {
    const strCtx = createStringifyContext(ctx.doc, {});
    strCtx.anchors = /* @__PURE__ */ new Set();
    for (const node of ctx.anchors.keys())
      strCtx.anchors.add(node.anchor);
    strCtx.inFlow = true;
    strCtx.inStringifyKey = true;
    const strKey = key.toString(strCtx);
    if (!ctx.mapKeyWarned) {
      let jsonStr = JSON.stringify(strKey);
      if (jsonStr.length > 40)
        jsonStr = jsonStr.substring(0, 36) + '..."';
      warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
      ctx.mapKeyWarned = true;
    }
    return strKey;
  }
  return JSON.stringify(jsKey);
}

// node_modules/yaml/browser/dist/nodes/Pair.js
function createPair(key, value, ctx) {
  const k = createNode(key, void 0, ctx);
  const v = createNode(value, void 0, ctx);
  return new Pair(k, v);
}
var Pair = class _Pair {
  constructor(key, value = null) {
    Object.defineProperty(this, NODE_TYPE, { value: PAIR });
    this.key = key;
    this.value = value;
  }
  clone(schema4) {
    let { key, value } = this;
    if (isNode(key))
      key = key.clone(schema4);
    if (isNode(value))
      value = value.clone(schema4);
    return new _Pair(key, value);
  }
  toJSON(_, ctx) {
    const pair = (ctx == null ? void 0 : ctx.mapAsMap) ? /* @__PURE__ */ new Map() : {};
    return addPairToJSMap(ctx, pair, this);
  }
  toString(ctx, onComment, onChompKeep) {
    return (ctx == null ? void 0 : ctx.doc) ? stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyCollection.js
function stringifyCollection(collection, ctx, options) {
  var _a;
  const flow = (_a = ctx.inFlow) != null ? _a : collection.flow;
  const stringify4 = flow ? stringifyFlowCollection : stringifyBlockCollection;
  return stringify4(collection, ctx, options);
}
function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
  const { indent, options: { commentString } } = ctx;
  const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
  let chompKeep = false;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    let comment2 = null;
    if (isNode(item)) {
      if (!chompKeep && item.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
      if (item.comment)
        comment2 = item.comment;
    } else if (isPair(item)) {
      const ik = isNode(item.key) ? item.key : null;
      if (ik) {
        if (!chompKeep && ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
      }
    }
    chompKeep = false;
    let str3 = stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
    if (comment2)
      str3 += lineComment(str3, itemIndent, commentString(comment2));
    if (chompKeep && comment2)
      chompKeep = false;
    lines.push(blockItemPrefix + str3);
  }
  let str2;
  if (lines.length === 0) {
    str2 = flowChars.start + flowChars.end;
  } else {
    str2 = lines[0];
    for (let i = 1; i < lines.length; ++i) {
      const line = lines[i];
      str2 += line ? `
${indent}${line}` : "\n";
    }
  }
  if (comment) {
    str2 += "\n" + indentComment(commentString(comment), indent);
    if (onComment)
      onComment();
  } else if (chompKeep && onChompKeep)
    onChompKeep();
  return str2;
}
function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
  const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
  itemIndent += indentStep;
  const itemCtx = Object.assign({}, ctx, {
    indent: itemIndent,
    inFlow: true,
    type: null
  });
  let reqNewline = false;
  let linesAtValue = 0;
  const lines = [];
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    let comment = null;
    if (isNode(item)) {
      if (item.spaceBefore)
        lines.push("");
      addCommentBefore(ctx, lines, item.commentBefore, false);
      if (item.comment)
        comment = item.comment;
    } else if (isPair(item)) {
      const ik = isNode(item.key) ? item.key : null;
      if (ik) {
        if (ik.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, ik.commentBefore, false);
        if (ik.comment)
          reqNewline = true;
      }
      const iv = isNode(item.value) ? item.value : null;
      if (iv) {
        if (iv.comment)
          comment = iv.comment;
        if (iv.commentBefore)
          reqNewline = true;
      } else if (item.value == null && (ik == null ? void 0 : ik.comment)) {
        comment = ik.comment;
      }
    }
    if (comment)
      reqNewline = true;
    let str2 = stringify(item, itemCtx, () => comment = null);
    reqNewline || (reqNewline = lines.length > linesAtValue || str2.includes("\n"));
    if (i < items.length - 1) {
      str2 += ",";
    } else if (ctx.options.trailingComma) {
      if (ctx.options.lineWidth > 0) {
        reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str2.length + 2) > ctx.options.lineWidth);
      }
      if (reqNewline) {
        str2 += ",";
      }
    }
    if (comment)
      str2 += lineComment(str2, itemIndent, commentString(comment));
    lines.push(str2);
    linesAtValue = lines.length;
  }
  const { start, end } = flowChars;
  if (lines.length === 0) {
    return start + end;
  } else {
    if (!reqNewline) {
      const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
      reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
    }
    if (reqNewline) {
      let str2 = start;
      for (const line of lines)
        str2 += line ? `
${indentStep}${indent}${line}` : "\n";
      return `${str2}
${indent}${end}`;
    } else {
      return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
    }
  }
}
function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
  if (comment && chompKeep)
    comment = comment.replace(/^\n+/, "");
  if (comment) {
    const ic = indentComment(commentString(comment), indent);
    lines.push(ic.trimStart());
  }
}

// node_modules/yaml/browser/dist/nodes/YAMLMap.js
function findPair(items, key) {
  const k = isScalar(key) ? key.value : key;
  for (const it of items) {
    if (isPair(it)) {
      if (it.key === key || it.key === k)
        return it;
      if (isScalar(it.key) && it.key.value === k)
        return it;
    }
  }
  return void 0;
}
var YAMLMap = class extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:map";
  }
  constructor(schema4) {
    super(MAP, schema4);
    this.items = [];
  }
  /**
   * A generic collection parsing method that can be extended
   * to other node classes that inherit from YAMLMap
   */
  static from(schema4, obj, ctx) {
    const { keepUndefined, replacer } = ctx;
    const map2 = new this(schema4);
    const add = (key, value) => {
      if (typeof replacer === "function")
        value = replacer.call(obj, key, value);
      else if (Array.isArray(replacer) && !replacer.includes(key))
        return;
      if (value !== void 0 || keepUndefined)
        map2.items.push(createPair(key, value, ctx));
    };
    if (obj instanceof Map) {
      for (const [key, value] of obj)
        add(key, value);
    } else if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj))
        add(key, obj[key]);
    }
    if (typeof schema4.sortMapEntries === "function") {
      map2.items.sort(schema4.sortMapEntries);
    }
    return map2;
  }
  /**
   * Adds a value to the collection.
   *
   * @param overwrite - If not set `true`, using a key that is already in the
   *   collection will throw. Otherwise, overwrites the previous value.
   */
  add(pair, overwrite) {
    var _a;
    let _pair;
    if (isPair(pair))
      _pair = pair;
    else if (!pair || typeof pair !== "object" || !("key" in pair)) {
      _pair = new Pair(pair, pair == null ? void 0 : pair.value);
    } else
      _pair = new Pair(pair.key, pair.value);
    const prev = findPair(this.items, _pair.key);
    const sortEntries = (_a = this.schema) == null ? void 0 : _a.sortMapEntries;
    if (prev) {
      if (!overwrite)
        throw new Error(`Key ${_pair.key} already set`);
      if (isScalar(prev.value) && isScalarValue(_pair.value))
        prev.value.value = _pair.value;
      else
        prev.value = _pair.value;
    } else if (sortEntries) {
      const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
      if (i === -1)
        this.items.push(_pair);
      else
        this.items.splice(i, 0, _pair);
    } else {
      this.items.push(_pair);
    }
  }
  delete(key) {
    const it = findPair(this.items, key);
    if (!it)
      return false;
    const del = this.items.splice(this.items.indexOf(it), 1);
    return del.length > 0;
  }
  get(key, keepScalar) {
    var _a;
    const it = findPair(this.items, key);
    const node = it == null ? void 0 : it.value;
    return (_a = !keepScalar && isScalar(node) ? node.value : node) != null ? _a : void 0;
  }
  has(key) {
    return !!findPair(this.items, key);
  }
  set(key, value) {
    this.add(new Pair(key, value), true);
  }
  /**
   * @param ctx - Conversion context, originally set in Document#toJS()
   * @param {Class} Type - If set, forces the returned collection type
   * @returns Instance of Type, Map, or Object
   */
  toJSON(_, ctx, Type) {
    const map2 = Type ? new Type() : (ctx == null ? void 0 : ctx.mapAsMap) ? /* @__PURE__ */ new Map() : {};
    if (ctx == null ? void 0 : ctx.onCreate)
      ctx.onCreate(map2);
    for (const item of this.items)
      addPairToJSMap(ctx, map2, item);
    return map2;
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    for (const item of this.items) {
      if (!isPair(item))
        throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
    }
    if (!ctx.allNullValues && this.hasAllNullValues(false))
      ctx = Object.assign({}, ctx, { allNullValues: true });
    return stringifyCollection(this, ctx, {
      blockItemPrefix: "",
      flowChars: { start: "{", end: "}" },
      itemIndent: ctx.indent || "",
      onChompKeep,
      onComment
    });
  }
};

// node_modules/yaml/browser/dist/schema/common/map.js
var map = {
  collection: "map",
  default: true,
  nodeClass: YAMLMap,
  tag: "tag:yaml.org,2002:map",
  resolve(map2, onError) {
    if (!isMap(map2))
      onError("Expected a mapping for this tag");
    return map2;
  },
  createNode: (schema4, obj, ctx) => YAMLMap.from(schema4, obj, ctx)
};

// node_modules/yaml/browser/dist/nodes/YAMLSeq.js
var YAMLSeq = class extends Collection {
  static get tagName() {
    return "tag:yaml.org,2002:seq";
  }
  constructor(schema4) {
    super(SEQ, schema4);
    this.items = [];
  }
  add(value) {
    this.items.push(value);
  }
  /**
   * Removes a value from the collection.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   *
   * @returns `true` if the item was found and removed.
   */
  delete(key) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      return false;
    const del = this.items.splice(idx, 1);
    return del.length > 0;
  }
  get(key, keepScalar) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      return void 0;
    const it = this.items[idx];
    return !keepScalar && isScalar(it) ? it.value : it;
  }
  /**
   * Checks if the collection includes a value with the key `key`.
   *
   * `key` must contain a representation of an integer for this to succeed.
   * It may be wrapped in a `Scalar`.
   */
  has(key) {
    const idx = asItemIndex(key);
    return typeof idx === "number" && idx < this.items.length;
  }
  /**
   * Sets a value in this collection. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   *
   * If `key` does not contain a representation of an integer, this will throw.
   * It may be wrapped in a `Scalar`.
   */
  set(key, value) {
    const idx = asItemIndex(key);
    if (typeof idx !== "number")
      throw new Error(`Expected a valid index, not ${key}.`);
    const prev = this.items[idx];
    if (isScalar(prev) && isScalarValue(value))
      prev.value = value;
    else
      this.items[idx] = value;
  }
  toJSON(_, ctx) {
    const seq2 = [];
    if (ctx == null ? void 0 : ctx.onCreate)
      ctx.onCreate(seq2);
    let i = 0;
    for (const item of this.items)
      seq2.push(toJS(item, String(i++), ctx));
    return seq2;
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    return stringifyCollection(this, ctx, {
      blockItemPrefix: "- ",
      flowChars: { start: "[", end: "]" },
      itemIndent: (ctx.indent || "") + "  ",
      onChompKeep,
      onComment
    });
  }
  static from(schema4, obj, ctx) {
    const { replacer } = ctx;
    const seq2 = new this(schema4);
    if (obj && Symbol.iterator in Object(obj)) {
      let i = 0;
      for (let it of obj) {
        if (typeof replacer === "function") {
          const key = obj instanceof Set ? it : String(i++);
          it = replacer.call(obj, key, it);
        }
        seq2.items.push(createNode(it, void 0, ctx));
      }
    }
    return seq2;
  }
};
function asItemIndex(key) {
  let idx = isScalar(key) ? key.value : key;
  if (idx && typeof idx === "string")
    idx = Number(idx);
  return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
}

// node_modules/yaml/browser/dist/schema/common/seq.js
var seq = {
  collection: "seq",
  default: true,
  nodeClass: YAMLSeq,
  tag: "tag:yaml.org,2002:seq",
  resolve(seq2, onError) {
    if (!isSeq(seq2))
      onError("Expected a sequence for this tag");
    return seq2;
  },
  createNode: (schema4, obj, ctx) => YAMLSeq.from(schema4, obj, ctx)
};

// node_modules/yaml/browser/dist/schema/common/string.js
var string = {
  identify: (value) => typeof value === "string",
  default: true,
  tag: "tag:yaml.org,2002:str",
  resolve: (str2) => str2,
  stringify(item, ctx, onComment, onChompKeep) {
    ctx = Object.assign({ actualString: true }, ctx);
    return stringifyString(item, ctx, onComment, onChompKeep);
  }
};

// node_modules/yaml/browser/dist/schema/common/null.js
var nullTag = {
  identify: (value) => value == null,
  createNode: () => new Scalar(null),
  default: true,
  tag: "tag:yaml.org,2002:null",
  test: /^(?:~|[Nn]ull|NULL)?$/,
  resolve: () => new Scalar(null),
  stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
};

// node_modules/yaml/browser/dist/schema/core/bool.js
var boolTag = {
  identify: (value) => typeof value === "boolean",
  default: true,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
  resolve: (str2) => new Scalar(str2[0] === "t" || str2[0] === "T"),
  stringify({ source, value }, ctx) {
    if (source && boolTag.test.test(source)) {
      const sv = source[0] === "t" || source[0] === "T";
      if (value === sv)
        return source;
    }
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyNumber.js
function stringifyNumber({ format, minFractionDigits, tag, value }) {
  if (typeof value === "bigint")
    return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (!isFinite(num))
    return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
  let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
  if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
    let i = n.indexOf(".");
    if (i < 0) {
      i = n.length;
      n += ".";
    }
    let d = minFractionDigits - (n.length - i - 1);
    while (d-- > 0)
      n += "0";
  }
  return n;
}

// node_modules/yaml/browser/dist/schema/core/float.js
var floatNaN = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (str2) => str2.slice(-3).toLowerCase() === "nan" ? NaN : str2[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: stringifyNumber
};
var floatExp = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
  resolve: (str2) => parseFloat(str2),
  stringify(node) {
    const num = Number(node.value);
    return isFinite(num) ? num.toExponential() : stringifyNumber(node);
  }
};
var float = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
  resolve(str2) {
    const node = new Scalar(parseFloat(str2));
    const dot = str2.indexOf(".");
    if (dot !== -1 && str2[str2.length - 1] === "0")
      node.minFractionDigits = str2.length - dot - 1;
    return node;
  },
  stringify: stringifyNumber
};

// node_modules/yaml/browser/dist/schema/core/int.js
var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
var intResolve = (str2, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str2) : parseInt(str2.substring(offset), radix);
function intStringify(node, radix, prefix) {
  const { value } = node;
  if (intIdentify(value) && value >= 0)
    return prefix + value.toString(radix);
  return stringifyNumber(node);
}
var intOct = {
  identify: (value) => intIdentify(value) && value >= 0,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^0o[0-7]+$/,
  resolve: (str2, _onError, opt) => intResolve(str2, 2, 8, opt),
  stringify: (node) => intStringify(node, 8, "0o")
};
var int = {
  identify: intIdentify,
  default: true,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9]+$/,
  resolve: (str2, _onError, opt) => intResolve(str2, 0, 10, opt),
  stringify: stringifyNumber
};
var intHex = {
  identify: (value) => intIdentify(value) && value >= 0,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^0x[0-9a-fA-F]+$/,
  resolve: (str2, _onError, opt) => intResolve(str2, 2, 16, opt),
  stringify: (node) => intStringify(node, 16, "0x")
};

// node_modules/yaml/browser/dist/schema/core/schema.js
var schema = [
  map,
  seq,
  string,
  nullTag,
  boolTag,
  intOct,
  int,
  intHex,
  floatNaN,
  floatExp,
  float
];

// node_modules/yaml/browser/dist/schema/json/schema.js
function intIdentify2(value) {
  return typeof value === "bigint" || Number.isInteger(value);
}
var stringifyJSON = ({ value }) => JSON.stringify(value);
var jsonScalars = [
  {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str2) => str2,
    stringify: stringifyJSON
  },
  {
    identify: (value) => value == null,
    createNode: () => new Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^null$/,
    resolve: () => null,
    stringify: stringifyJSON
  },
  {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^true$|^false$/,
    resolve: (str2) => str2 === "true",
    stringify: stringifyJSON
  },
  {
    identify: intIdentify2,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^-?(?:0|[1-9][0-9]*)$/,
    resolve: (str2, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str2) : parseInt(str2, 10),
    stringify: ({ value }) => intIdentify2(value) ? value.toString() : JSON.stringify(value)
  },
  {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
    resolve: (str2) => parseFloat(str2),
    stringify: stringifyJSON
  }
];
var jsonError = {
  default: true,
  tag: "",
  test: /^/,
  resolve(str2, onError) {
    onError(`Unresolved plain scalar ${JSON.stringify(str2)}`);
    return str2;
  }
};
var schema2 = [map, seq].concat(jsonScalars, jsonError);

// node_modules/yaml/browser/dist/schema/yaml-1.1/binary.js
var binary = {
  identify: (value) => value instanceof Uint8Array,
  // Buffer inherits from Uint8Array
  default: false,
  tag: "tag:yaml.org,2002:binary",
  /**
   * Returns a Buffer in node and an Uint8Array in browsers
   *
   * To use the resulting buffer as an image, you'll want to do something like:
   *
   *   const blob = new Blob([buffer], { type: 'image/jpeg' })
   *   document.querySelector('#photo').src = URL.createObjectURL(blob)
   */
  resolve(src, onError) {
    if (typeof atob === "function") {
      const str2 = atob(src.replace(/[\n\r]/g, ""));
      const buffer = new Uint8Array(str2.length);
      for (let i = 0; i < str2.length; ++i)
        buffer[i] = str2.charCodeAt(i);
      return buffer;
    } else {
      onError("This environment does not support reading binary tags; either Buffer or atob is required");
      return src;
    }
  },
  stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
    if (!value)
      return "";
    const buf = value;
    let str2;
    if (typeof btoa === "function") {
      let s = "";
      for (let i = 0; i < buf.length; ++i)
        s += String.fromCharCode(buf[i]);
      str2 = btoa(s);
    } else {
      throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
    }
    type != null ? type : type = Scalar.BLOCK_LITERAL;
    if (type !== Scalar.QUOTE_DOUBLE) {
      const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
      const n = Math.ceil(str2.length / lineWidth);
      const lines = new Array(n);
      for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
        lines[i] = str2.substr(o, lineWidth);
      }
      str2 = lines.join(type === Scalar.BLOCK_LITERAL ? "\n" : " ");
    }
    return stringifyString({ comment, type, value: str2 }, ctx, onComment, onChompKeep);
  }
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/pairs.js
function resolvePairs(seq2, onError) {
  var _a;
  if (isSeq(seq2)) {
    for (let i = 0; i < seq2.items.length; ++i) {
      let item = seq2.items[i];
      if (isPair(item))
        continue;
      else if (isMap(item)) {
        if (item.items.length > 1)
          onError("Each pair must have its own sequence indicator");
        const pair = item.items[0] || new Pair(new Scalar(null));
        if (item.commentBefore)
          pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
        if (item.comment) {
          const cn = (_a = pair.value) != null ? _a : pair.key;
          cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
        }
        item = pair;
      }
      seq2.items[i] = isPair(item) ? item : new Pair(item);
    }
  } else
    onError("Expected a sequence for this tag");
  return seq2;
}
function createPairs(schema4, iterable, ctx) {
  const { replacer } = ctx;
  const pairs2 = new YAMLSeq(schema4);
  pairs2.tag = "tag:yaml.org,2002:pairs";
  let i = 0;
  if (iterable && Symbol.iterator in Object(iterable))
    for (let it of iterable) {
      if (typeof replacer === "function")
        it = replacer.call(iterable, String(i++), it);
      let key, value;
      if (Array.isArray(it)) {
        if (it.length === 2) {
          key = it[0];
          value = it[1];
        } else
          throw new TypeError(`Expected [key, value] tuple: ${it}`);
      } else if (it && it instanceof Object) {
        const keys = Object.keys(it);
        if (keys.length === 1) {
          key = keys[0];
          value = it[key];
        } else {
          throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
        }
      } else {
        key = it;
      }
      pairs2.items.push(createPair(key, value, ctx));
    }
  return pairs2;
}
var pairs = {
  collection: "seq",
  default: false,
  tag: "tag:yaml.org,2002:pairs",
  resolve: resolvePairs,
  createNode: createPairs
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/omap.js
var YAMLOMap = class _YAMLOMap extends YAMLSeq {
  constructor() {
    super();
    this.add = YAMLMap.prototype.add.bind(this);
    this.delete = YAMLMap.prototype.delete.bind(this);
    this.get = YAMLMap.prototype.get.bind(this);
    this.has = YAMLMap.prototype.has.bind(this);
    this.set = YAMLMap.prototype.set.bind(this);
    this.tag = _YAMLOMap.tag;
  }
  /**
   * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
   * but TypeScript won't allow widening the signature of a child method.
   */
  toJSON(_, ctx) {
    if (!ctx)
      return super.toJSON(_);
    const map2 = /* @__PURE__ */ new Map();
    if (ctx == null ? void 0 : ctx.onCreate)
      ctx.onCreate(map2);
    for (const pair of this.items) {
      let key, value;
      if (isPair(pair)) {
        key = toJS(pair.key, "", ctx);
        value = toJS(pair.value, key, ctx);
      } else {
        key = toJS(pair, "", ctx);
      }
      if (map2.has(key))
        throw new Error("Ordered maps must not include duplicate keys");
      map2.set(key, value);
    }
    return map2;
  }
  static from(schema4, iterable, ctx) {
    const pairs2 = createPairs(schema4, iterable, ctx);
    const omap2 = new this();
    omap2.items = pairs2.items;
    return omap2;
  }
};
YAMLOMap.tag = "tag:yaml.org,2002:omap";
var omap = {
  collection: "seq",
  identify: (value) => value instanceof Map,
  nodeClass: YAMLOMap,
  default: false,
  tag: "tag:yaml.org,2002:omap",
  resolve(seq2, onError) {
    const pairs2 = resolvePairs(seq2, onError);
    const seenKeys = [];
    for (const { key } of pairs2.items) {
      if (isScalar(key)) {
        if (seenKeys.includes(key.value)) {
          onError(`Ordered maps must not include duplicate keys: ${key.value}`);
        } else {
          seenKeys.push(key.value);
        }
      }
    }
    return Object.assign(new YAMLOMap(), pairs2);
  },
  createNode: (schema4, iterable, ctx) => YAMLOMap.from(schema4, iterable, ctx)
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/bool.js
function boolStringify({ value, source }, ctx) {
  const boolObj = value ? trueTag : falseTag;
  if (source && boolObj.test.test(source))
    return source;
  return value ? ctx.options.trueStr : ctx.options.falseStr;
}
var trueTag = {
  identify: (value) => value === true,
  default: true,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
  resolve: () => new Scalar(true),
  stringify: boolStringify
};
var falseTag = {
  identify: (value) => value === false,
  default: true,
  tag: "tag:yaml.org,2002:bool",
  test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
  resolve: () => new Scalar(false),
  stringify: boolStringify
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/float.js
var floatNaN2 = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
  resolve: (str2) => str2.slice(-3).toLowerCase() === "nan" ? NaN : str2[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
  stringify: stringifyNumber
};
var floatExp2 = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  format: "EXP",
  test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
  resolve: (str2) => parseFloat(str2.replace(/_/g, "")),
  stringify(node) {
    const num = Number(node.value);
    return isFinite(num) ? num.toExponential() : stringifyNumber(node);
  }
};
var float2 = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
  resolve(str2) {
    const node = new Scalar(parseFloat(str2.replace(/_/g, "")));
    const dot = str2.indexOf(".");
    if (dot !== -1) {
      const f = str2.substring(dot + 1).replace(/_/g, "");
      if (f[f.length - 1] === "0")
        node.minFractionDigits = f.length;
    }
    return node;
  },
  stringify: stringifyNumber
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/int.js
var intIdentify3 = (value) => typeof value === "bigint" || Number.isInteger(value);
function intResolve2(str2, offset, radix, { intAsBigInt }) {
  const sign = str2[0];
  if (sign === "-" || sign === "+")
    offset += 1;
  str2 = str2.substring(offset).replace(/_/g, "");
  if (intAsBigInt) {
    switch (radix) {
      case 2:
        str2 = `0b${str2}`;
        break;
      case 8:
        str2 = `0o${str2}`;
        break;
      case 16:
        str2 = `0x${str2}`;
        break;
    }
    const n2 = BigInt(str2);
    return sign === "-" ? BigInt(-1) * n2 : n2;
  }
  const n = parseInt(str2, radix);
  return sign === "-" ? -1 * n : n;
}
function intStringify2(node, radix, prefix) {
  const { value } = node;
  if (intIdentify3(value)) {
    const str2 = value.toString(radix);
    return value < 0 ? "-" + prefix + str2.substr(1) : prefix + str2;
  }
  return stringifyNumber(node);
}
var intBin = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "BIN",
  test: /^[-+]?0b[0-1_]+$/,
  resolve: (str2, _onError, opt) => intResolve2(str2, 2, 2, opt),
  stringify: (node) => intStringify2(node, 2, "0b")
};
var intOct2 = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "OCT",
  test: /^[-+]?0[0-7_]+$/,
  resolve: (str2, _onError, opt) => intResolve2(str2, 1, 8, opt),
  stringify: (node) => intStringify2(node, 8, "0")
};
var int2 = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  test: /^[-+]?[0-9][0-9_]*$/,
  resolve: (str2, _onError, opt) => intResolve2(str2, 0, 10, opt),
  stringify: stringifyNumber
};
var intHex2 = {
  identify: intIdentify3,
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "HEX",
  test: /^[-+]?0x[0-9a-fA-F_]+$/,
  resolve: (str2, _onError, opt) => intResolve2(str2, 2, 16, opt),
  stringify: (node) => intStringify2(node, 16, "0x")
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/set.js
var YAMLSet = class _YAMLSet extends YAMLMap {
  constructor(schema4) {
    super(schema4);
    this.tag = _YAMLSet.tag;
  }
  add(key) {
    let pair;
    if (isPair(key))
      pair = key;
    else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
      pair = new Pair(key.key, null);
    else
      pair = new Pair(key, null);
    const prev = findPair(this.items, pair.key);
    if (!prev)
      this.items.push(pair);
  }
  /**
   * If `keepPair` is `true`, returns the Pair matching `key`.
   * Otherwise, returns the value of that Pair's key.
   */
  get(key, keepPair) {
    const pair = findPair(this.items, key);
    return !keepPair && isPair(pair) ? isScalar(pair.key) ? pair.key.value : pair.key : pair;
  }
  set(key, value) {
    if (typeof value !== "boolean")
      throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
    const prev = findPair(this.items, key);
    if (prev && !value) {
      this.items.splice(this.items.indexOf(prev), 1);
    } else if (!prev && value) {
      this.items.push(new Pair(key));
    }
  }
  toJSON(_, ctx) {
    return super.toJSON(_, ctx, Set);
  }
  toString(ctx, onComment, onChompKeep) {
    if (!ctx)
      return JSON.stringify(this);
    if (this.hasAllNullValues(true))
      return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
    else
      throw new Error("Set items must all have null values");
  }
  static from(schema4, iterable, ctx) {
    const { replacer } = ctx;
    const set2 = new this(schema4);
    if (iterable && Symbol.iterator in Object(iterable))
      for (let value of iterable) {
        if (typeof replacer === "function")
          value = replacer.call(iterable, value, value);
        set2.items.push(createPair(value, null, ctx));
      }
    return set2;
  }
};
YAMLSet.tag = "tag:yaml.org,2002:set";
var set = {
  collection: "map",
  identify: (value) => value instanceof Set,
  nodeClass: YAMLSet,
  default: false,
  tag: "tag:yaml.org,2002:set",
  createNode: (schema4, iterable, ctx) => YAMLSet.from(schema4, iterable, ctx),
  resolve(map2, onError) {
    if (isMap(map2)) {
      if (map2.hasAllNullValues(true))
        return Object.assign(new YAMLSet(), map2);
      else
        onError("Set items must all have null values");
    } else
      onError("Expected a mapping for this tag");
    return map2;
  }
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/timestamp.js
function parseSexagesimal(str2, asBigInt) {
  const sign = str2[0];
  const parts = sign === "-" || sign === "+" ? str2.substring(1) : str2;
  const num = (n) => asBigInt ? BigInt(n) : Number(n);
  const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
  return sign === "-" ? num(-1) * res : res;
}
function stringifySexagesimal(node) {
  let { value } = node;
  let num = (n) => n;
  if (typeof value === "bigint")
    num = (n) => BigInt(n);
  else if (isNaN(value) || !isFinite(value))
    return stringifyNumber(node);
  let sign = "";
  if (value < 0) {
    sign = "-";
    value *= num(-1);
  }
  const _60 = num(60);
  const parts = [value % _60];
  if (value < 60) {
    parts.unshift(0);
  } else {
    value = (value - parts[0]) / _60;
    parts.unshift(value % _60);
    if (value >= 60) {
      value = (value - parts[0]) / _60;
      parts.unshift(value);
    }
  }
  return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
}
var intTime = {
  identify: (value) => typeof value === "bigint" || Number.isInteger(value),
  default: true,
  tag: "tag:yaml.org,2002:int",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
  resolve: (str2, _onError, { intAsBigInt }) => parseSexagesimal(str2, intAsBigInt),
  stringify: stringifySexagesimal
};
var floatTime = {
  identify: (value) => typeof value === "number",
  default: true,
  tag: "tag:yaml.org,2002:float",
  format: "TIME",
  test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
  resolve: (str2) => parseSexagesimal(str2, false),
  stringify: stringifySexagesimal
};
var timestamp = {
  identify: (value) => value instanceof Date,
  default: true,
  tag: "tag:yaml.org,2002:timestamp",
  // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
  // may be omitted altogether, resulting in a date format. In such a case, the time part is
  // assumed to be 00:00:00Z (start of day, UTC).
  test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
  resolve(str2) {
    const match = str2.match(timestamp.test);
    if (!match)
      throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
    const [, year, month, day, hour, minute, second] = match.map(Number);
    const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
    let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
    const tz = match[8];
    if (tz && tz !== "Z") {
      let d = parseSexagesimal(tz, false);
      if (Math.abs(d) < 30)
        d *= 60;
      date -= 6e4 * d;
    }
    return new Date(date);
  },
  stringify: ({ value }) => {
    var _a;
    return (_a = value == null ? void 0 : value.toISOString().replace(/(T00:00:00)?\.000Z$/, "")) != null ? _a : "";
  }
};

// node_modules/yaml/browser/dist/schema/yaml-1.1/schema.js
var schema3 = [
  map,
  seq,
  string,
  nullTag,
  trueTag,
  falseTag,
  intBin,
  intOct2,
  int2,
  intHex2,
  floatNaN2,
  floatExp2,
  float2,
  binary,
  merge,
  omap,
  pairs,
  set,
  intTime,
  floatTime,
  timestamp
];

// node_modules/yaml/browser/dist/schema/tags.js
var schemas = /* @__PURE__ */ new Map([
  ["core", schema],
  ["failsafe", [map, seq, string]],
  ["json", schema2],
  ["yaml11", schema3],
  ["yaml-1.1", schema3]
]);
var tagsByName = {
  binary,
  bool: boolTag,
  float,
  floatExp,
  floatNaN,
  floatTime,
  int,
  intHex,
  intOct,
  intTime,
  map,
  merge,
  null: nullTag,
  omap,
  pairs,
  seq,
  set,
  timestamp
};
var coreKnownTags = {
  "tag:yaml.org,2002:binary": binary,
  "tag:yaml.org,2002:merge": merge,
  "tag:yaml.org,2002:omap": omap,
  "tag:yaml.org,2002:pairs": pairs,
  "tag:yaml.org,2002:set": set,
  "tag:yaml.org,2002:timestamp": timestamp
};
function getTags(customTags, schemaName, addMergeTag) {
  const schemaTags = schemas.get(schemaName);
  if (schemaTags && !customTags) {
    return addMergeTag && !schemaTags.includes(merge) ? schemaTags.concat(merge) : schemaTags.slice();
  }
  let tags = schemaTags;
  if (!tags) {
    if (Array.isArray(customTags))
      tags = [];
    else {
      const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
      throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
    }
  }
  if (Array.isArray(customTags)) {
    for (const tag of customTags)
      tags = tags.concat(tag);
  } else if (typeof customTags === "function") {
    tags = customTags(tags.slice());
  }
  if (addMergeTag)
    tags = tags.concat(merge);
  return tags.reduce((tags2, tag) => {
    const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
    if (!tagObj) {
      const tagName = JSON.stringify(tag);
      const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
      throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
    }
    if (!tags2.includes(tagObj))
      tags2.push(tagObj);
    return tags2;
  }, []);
}

// node_modules/yaml/browser/dist/schema/Schema.js
var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
var Schema = class _Schema {
  constructor({ compat, customTags, merge: merge2, resolveKnownTags, schema: schema4, sortMapEntries, toStringDefaults }) {
    this.compat = Array.isArray(compat) ? getTags(compat, "compat") : compat ? getTags(null, compat) : null;
    this.name = typeof schema4 === "string" && schema4 || "core";
    this.knownTags = resolveKnownTags ? coreKnownTags : {};
    this.tags = getTags(customTags, this.name, merge2);
    this.toStringOptions = toStringDefaults != null ? toStringDefaults : null;
    Object.defineProperty(this, MAP, { value: map });
    Object.defineProperty(this, SCALAR, { value: string });
    Object.defineProperty(this, SEQ, { value: seq });
    this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
  }
  clone() {
    const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
    copy.tags = this.tags.slice();
    return copy;
  }
};

// node_modules/yaml/browser/dist/stringify/stringifyDocument.js
function stringifyDocument(doc, options) {
  var _a;
  const lines = [];
  let hasDirectives = options.directives === true;
  if (options.directives !== false && doc.directives) {
    const dir = doc.directives.toString(doc);
    if (dir) {
      lines.push(dir);
      hasDirectives = true;
    } else if (doc.directives.docStart)
      hasDirectives = true;
  }
  if (hasDirectives)
    lines.push("---");
  const ctx = createStringifyContext(doc, options);
  const { commentString } = ctx.options;
  if (doc.commentBefore) {
    if (lines.length !== 1)
      lines.unshift("");
    const cs = commentString(doc.commentBefore);
    lines.unshift(indentComment(cs, ""));
  }
  let chompKeep = false;
  let contentComment = null;
  if (doc.contents) {
    if (isNode(doc.contents)) {
      if (doc.contents.spaceBefore && hasDirectives)
        lines.push("");
      if (doc.contents.commentBefore) {
        const cs = commentString(doc.contents.commentBefore);
        lines.push(indentComment(cs, ""));
      }
      ctx.forceBlockIndent = !!doc.comment;
      contentComment = doc.contents.comment;
    }
    const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
    let body = stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
    if (contentComment)
      body += lineComment(body, "", commentString(contentComment));
    if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
      lines[lines.length - 1] = `--- ${body}`;
    } else
      lines.push(body);
  } else {
    lines.push(stringify(doc.contents, ctx));
  }
  if ((_a = doc.directives) == null ? void 0 : _a.docEnd) {
    if (doc.comment) {
      const cs = commentString(doc.comment);
      if (cs.includes("\n")) {
        lines.push("...");
        lines.push(indentComment(cs, ""));
      } else {
        lines.push(`... ${cs}`);
      }
    } else {
      lines.push("...");
    }
  } else {
    let dc = doc.comment;
    if (dc && chompKeep)
      dc = dc.replace(/^\n+/, "");
    if (dc) {
      if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
        lines.push("");
      lines.push(indentComment(commentString(dc), ""));
    }
  }
  return lines.join("\n") + "\n";
}

// node_modules/yaml/browser/dist/doc/Document.js
var Document = class _Document {
  constructor(value, replacer, options) {
    this.commentBefore = null;
    this.comment = null;
    this.errors = [];
    this.warnings = [];
    Object.defineProperty(this, NODE_TYPE, { value: DOC });
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === void 0 && replacer) {
      options = replacer;
      replacer = void 0;
    }
    const opt = Object.assign({
      intAsBigInt: false,
      keepSourceTokens: false,
      logLevel: "warn",
      prettyErrors: true,
      strict: true,
      stringKeys: false,
      uniqueKeys: true,
      version: "1.2"
    }, options);
    this.options = opt;
    let { version } = opt;
    if (options == null ? void 0 : options._directives) {
      this.directives = options._directives.atDocument();
      if (this.directives.yaml.explicit)
        version = this.directives.yaml.version;
    } else
      this.directives = new Directives({ version });
    this.setSchema(version, options);
    this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
  }
  /**
   * Create a deep copy of this Document and its contents.
   *
   * Custom Node values that inherit from `Object` still refer to their original instances.
   */
  clone() {
    const copy = Object.create(_Document.prototype, {
      [NODE_TYPE]: { value: DOC }
    });
    copy.commentBefore = this.commentBefore;
    copy.comment = this.comment;
    copy.errors = this.errors.slice();
    copy.warnings = this.warnings.slice();
    copy.options = Object.assign({}, this.options);
    if (this.directives)
      copy.directives = this.directives.clone();
    copy.schema = this.schema.clone();
    copy.contents = isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
    if (this.range)
      copy.range = this.range.slice();
    return copy;
  }
  /** Adds a value to the document. */
  add(value) {
    if (assertCollection(this.contents))
      this.contents.add(value);
  }
  /** Adds a value to the document. */
  addIn(path, value) {
    if (assertCollection(this.contents))
      this.contents.addIn(path, value);
  }
  /**
   * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
   *
   * If `node` already has an anchor, `name` is ignored.
   * Otherwise, the `node.anchor` value will be set to `name`,
   * or if an anchor with that name is already present in the document,
   * `name` will be used as a prefix for a new unique anchor.
   * If `name` is undefined, the generated anchor will use 'a' as a prefix.
   */
  createAlias(node, name) {
    if (!node.anchor) {
      const prev = anchorNames(this);
      node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      !name || prev.has(name) ? findNewAnchor(name || "a", prev) : name;
    }
    return new Alias(node.anchor);
  }
  createNode(value, replacer, options) {
    let _replacer = void 0;
    if (typeof replacer === "function") {
      value = replacer.call({ "": value }, "", value);
      _replacer = replacer;
    } else if (Array.isArray(replacer)) {
      const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
      const asStr = replacer.filter(keyToStr).map(String);
      if (asStr.length > 0)
        replacer = replacer.concat(asStr);
      _replacer = replacer;
    } else if (options === void 0 && replacer) {
      options = replacer;
      replacer = void 0;
    }
    const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options != null ? options : {};
    const { onAnchor, setAnchors, sourceObjects } = createNodeAnchors(
      this,
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      anchorPrefix || "a"
    );
    const ctx = {
      aliasDuplicateObjects: aliasDuplicateObjects != null ? aliasDuplicateObjects : true,
      keepUndefined: keepUndefined != null ? keepUndefined : false,
      onAnchor,
      onTagObj,
      replacer: _replacer,
      schema: this.schema,
      sourceObjects
    };
    const node = createNode(value, tag, ctx);
    if (flow && isCollection(node))
      node.flow = true;
    setAnchors();
    return node;
  }
  /**
   * Convert a key and a value into a `Pair` using the current schema,
   * recursively wrapping all values as `Scalar` or `Collection` nodes.
   */
  createPair(key, value, options = {}) {
    const k = this.createNode(key, null, options);
    const v = this.createNode(value, null, options);
    return new Pair(k, v);
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  delete(key) {
    return assertCollection(this.contents) ? this.contents.delete(key) : false;
  }
  /**
   * Removes a value from the document.
   * @returns `true` if the item was found and removed.
   */
  deleteIn(path) {
    if (isEmptyPath(path)) {
      if (this.contents == null)
        return false;
      this.contents = null;
      return true;
    }
    return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
  }
  /**
   * Returns item at `key`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  get(key, keepScalar) {
    return isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
  }
  /**
   * Returns item at `path`, or `undefined` if not found. By default unwraps
   * scalar values from their surrounding node; to disable set `keepScalar` to
   * `true` (collections are always returned intact).
   */
  getIn(path, keepScalar) {
    if (isEmptyPath(path))
      return !keepScalar && isScalar(this.contents) ? this.contents.value : this.contents;
    return isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
  }
  /**
   * Checks if the document includes a value with the key `key`.
   */
  has(key) {
    return isCollection(this.contents) ? this.contents.has(key) : false;
  }
  /**
   * Checks if the document includes a value at `path`.
   */
  hasIn(path) {
    if (isEmptyPath(path))
      return this.contents !== void 0;
    return isCollection(this.contents) ? this.contents.hasIn(path) : false;
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  set(key, value) {
    if (this.contents == null) {
      this.contents = collectionFromPath(this.schema, [key], value);
    } else if (assertCollection(this.contents)) {
      this.contents.set(key, value);
    }
  }
  /**
   * Sets a value in this document. For `!!set`, `value` needs to be a
   * boolean to add/remove the item from the set.
   */
  setIn(path, value) {
    if (isEmptyPath(path)) {
      this.contents = value;
    } else if (this.contents == null) {
      this.contents = collectionFromPath(this.schema, Array.from(path), value);
    } else if (assertCollection(this.contents)) {
      this.contents.setIn(path, value);
    }
  }
  /**
   * Change the YAML version and schema used by the document.
   * A `null` version disables support for directives, explicit tags, anchors, and aliases.
   * It also requires the `schema` option to be given as a `Schema` instance value.
   *
   * Overrides all previously set schema options.
   */
  setSchema(version, options = {}) {
    if (typeof version === "number")
      version = String(version);
    let opt;
    switch (version) {
      case "1.1":
        if (this.directives)
          this.directives.yaml.version = "1.1";
        else
          this.directives = new Directives({ version: "1.1" });
        opt = { resolveKnownTags: false, schema: "yaml-1.1" };
        break;
      case "1.2":
      case "next":
        if (this.directives)
          this.directives.yaml.version = version;
        else
          this.directives = new Directives({ version });
        opt = { resolveKnownTags: true, schema: "core" };
        break;
      case null:
        if (this.directives)
          delete this.directives;
        opt = null;
        break;
      default: {
        const sv = JSON.stringify(version);
        throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
      }
    }
    if (options.schema instanceof Object)
      this.schema = options.schema;
    else if (opt)
      this.schema = new Schema(Object.assign(opt, options));
    else
      throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
  }
  // json & jsonArg are only used from toJSON()
  toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
    const ctx = {
      anchors: /* @__PURE__ */ new Map(),
      doc: this,
      keep: !json,
      mapAsMap: mapAsMap === true,
      mapKeyWarned: false,
      maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
    };
    const res = toJS(this.contents, jsonArg != null ? jsonArg : "", ctx);
    if (typeof onAnchor === "function")
      for (const { count, res: res2 } of ctx.anchors.values())
        onAnchor(res2, count);
    return typeof reviver === "function" ? applyReviver(reviver, { "": res }, "", res) : res;
  }
  /**
   * A JSON representation of the document `contents`.
   *
   * @param jsonArg Used by `JSON.stringify` to indicate the array index or
   *   property name.
   */
  toJSON(jsonArg, onAnchor) {
    return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
  }
  /** A YAML representation of the document. */
  toString(options = {}) {
    if (this.errors.length > 0)
      throw new Error("Document with errors cannot be stringified");
    if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
      const s = JSON.stringify(options.indent);
      throw new Error(`"indent" option must be a positive integer, not ${s}`);
    }
    return stringifyDocument(this, options);
  }
};
function assertCollection(contents) {
  if (isCollection(contents))
    return true;
  throw new Error("Expected a YAML collection as document contents");
}

// node_modules/yaml/browser/dist/errors.js
var YAMLError = class extends Error {
  constructor(name, pos, code, message) {
    super();
    this.name = name;
    this.code = code;
    this.message = message;
    this.pos = pos;
  }
};
var YAMLParseError = class extends YAMLError {
  constructor(pos, code, message) {
    super("YAMLParseError", pos, code, message);
  }
};
var YAMLWarning = class extends YAMLError {
  constructor(pos, code, message) {
    super("YAMLWarning", pos, code, message);
  }
};
var prettifyError = (src, lc) => (error) => {
  if (error.pos[0] === -1)
    return;
  error.linePos = error.pos.map((pos) => lc.linePos(pos));
  const { line, col } = error.linePos[0];
  error.message += ` at line ${line}, column ${col}`;
  let ci = col - 1;
  let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
  if (ci >= 60 && lineStr.length > 80) {
    const trimStart = Math.min(ci - 39, lineStr.length - 79);
    lineStr = "\u2026" + lineStr.substring(trimStart);
    ci -= trimStart - 1;
  }
  if (lineStr.length > 80)
    lineStr = lineStr.substring(0, 79) + "\u2026";
  if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
    let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
    if (prev.length > 80)
      prev = prev.substring(0, 79) + "\u2026\n";
    lineStr = prev + lineStr;
  }
  if (/[^ ]/.test(lineStr)) {
    let count = 1;
    const end = error.linePos[1];
    if ((end == null ? void 0 : end.line) === line && end.col > col) {
      count = Math.max(1, Math.min(end.col - col, 80 - ci));
    }
    const pointer = " ".repeat(ci) + "^".repeat(count);
    error.message += `:

${lineStr}
${pointer}
`;
  }
};

// node_modules/yaml/browser/dist/compose/resolve-props.js
function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
  let spaceBefore = false;
  let atNewline = startOnNewline;
  let hasSpace = startOnNewline;
  let comment = "";
  let commentSep = "";
  let hasNewline = false;
  let reqSpace = false;
  let tab = null;
  let anchor = null;
  let tag = null;
  let newlineAfterProp = null;
  let comma = null;
  let found = null;
  let start = null;
  for (const token of tokens) {
    if (reqSpace) {
      if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
        onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      reqSpace = false;
    }
    if (tab) {
      if (atNewline && token.type !== "comment" && token.type !== "newline") {
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      }
      tab = null;
    }
    switch (token.type) {
      case "space":
        if (!flow && (indicator !== "doc-start" || (next == null ? void 0 : next.type) !== "flow-collection") && token.source.includes("	")) {
          tab = token;
        }
        hasSpace = true;
        break;
      case "comment": {
        if (!hasSpace)
          onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
        const cb = token.source.substring(1) || " ";
        if (!comment)
          comment = cb;
        else
          comment += commentSep + cb;
        commentSep = "";
        atNewline = false;
        break;
      }
      case "newline":
        if (atNewline) {
          if (comment)
            comment += token.source;
          else if (!found || indicator !== "seq-item-ind")
            spaceBefore = true;
        } else
          commentSep += token.source;
        atNewline = true;
        hasNewline = true;
        if (anchor || tag)
          newlineAfterProp = token;
        hasSpace = true;
        break;
      case "anchor":
        if (anchor)
          onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
        if (token.source.endsWith(":"))
          onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
        anchor = token;
        start != null ? start : start = token.offset;
        atNewline = false;
        hasSpace = false;
        reqSpace = true;
        break;
      case "tag": {
        if (tag)
          onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
        tag = token;
        start != null ? start : start = token.offset;
        atNewline = false;
        hasSpace = false;
        reqSpace = true;
        break;
      }
      case indicator:
        if (anchor || tag)
          onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
        if (found)
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow != null ? flow : "collection"}`);
        found = token;
        atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
        hasSpace = false;
        break;
      case "comma":
        if (flow) {
          if (comma)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
          comma = token;
          atNewline = false;
          hasSpace = false;
          break;
        }
      // else fallthrough
      default:
        onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
        atNewline = false;
        hasSpace = false;
    }
  }
  const last = tokens[tokens.length - 1];
  const end = last ? last.offset + last.source.length : offset;
  if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
    onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
  }
  if (tab && (atNewline && tab.indent <= parentIndent || (next == null ? void 0 : next.type) === "block-map" || (next == null ? void 0 : next.type) === "block-seq"))
    onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
  return {
    comma,
    found,
    spaceBefore,
    comment,
    hasNewline,
    anchor,
    tag,
    newlineAfterProp,
    end,
    start: start != null ? start : end
  };
}

// node_modules/yaml/browser/dist/compose/util-contains-newline.js
function containsNewline(key) {
  if (!key)
    return null;
  switch (key.type) {
    case "alias":
    case "scalar":
    case "double-quoted-scalar":
    case "single-quoted-scalar":
      if (key.source.includes("\n"))
        return true;
      if (key.end) {
        for (const st of key.end)
          if (st.type === "newline")
            return true;
      }
      return false;
    case "flow-collection":
      for (const it of key.items) {
        for (const st of it.start)
          if (st.type === "newline")
            return true;
        if (it.sep) {
          for (const st of it.sep)
            if (st.type === "newline")
              return true;
        }
        if (containsNewline(it.key) || containsNewline(it.value))
          return true;
      }
      return false;
    default:
      return true;
  }
}

// node_modules/yaml/browser/dist/compose/util-flow-indent-check.js
function flowIndentCheck(indent, fc, onError) {
  if ((fc == null ? void 0 : fc.type) === "flow-collection") {
    const end = fc.end[0];
    if (end.indent === indent && (end.source === "]" || end.source === "}") && containsNewline(fc)) {
      const msg = "Flow end indicator should be more indented than parent";
      onError(end, "BAD_INDENT", msg, true);
    }
  }
}

// node_modules/yaml/browser/dist/compose/util-map-includes.js
function mapIncludes(ctx, items, search) {
  const { uniqueKeys } = ctx.options;
  if (uniqueKeys === false)
    return false;
  const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || isScalar(a) && isScalar(b) && a.value === b.value;
  return items.some((pair) => isEqual(pair.key, search));
}

// node_modules/yaml/browser/dist/compose/resolve-block-map.js
var startColMsg = "All mapping items must start at the same column";
function resolveBlockMap({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bm, onError, tag) {
  var _a, _b;
  const NodeClass = (_a = tag == null ? void 0 : tag.nodeClass) != null ? _a : YAMLMap;
  const map2 = new NodeClass(ctx.schema);
  if (ctx.atRoot)
    ctx.atRoot = false;
  let offset = bm.offset;
  let commentEnd = null;
  for (const collItem of bm.items) {
    const { start, key, sep, value } = collItem;
    const keyProps = resolveProps(start, {
      indicator: "explicit-key-ind",
      next: key != null ? key : sep == null ? void 0 : sep[0],
      offset,
      onError,
      parentIndent: bm.indent,
      startOnNewline: true
    });
    const implicitKey = !keyProps.found;
    if (implicitKey) {
      if (key) {
        if (key.type === "block-seq")
          onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
        else if ("indent" in key && key.indent !== bm.indent)
          onError(offset, "BAD_INDENT", startColMsg);
      }
      if (!keyProps.anchor && !keyProps.tag && !sep) {
        commentEnd = keyProps.end;
        if (keyProps.comment) {
          if (map2.comment)
            map2.comment += "\n" + keyProps.comment;
          else
            map2.comment = keyProps.comment;
        }
        continue;
      }
      if (keyProps.newlineAfterProp || containsNewline(key)) {
        onError(key != null ? key : start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
      }
    } else if (((_b = keyProps.found) == null ? void 0 : _b.indent) !== bm.indent) {
      onError(offset, "BAD_INDENT", startColMsg);
    }
    ctx.atKey = true;
    const keyStart = keyProps.end;
    const keyNode = key ? composeNode2(ctx, key, keyProps, onError) : composeEmptyNode2(ctx, keyStart, start, null, keyProps, onError);
    if (ctx.schema.compat)
      flowIndentCheck(bm.indent, key, onError);
    ctx.atKey = false;
    if (mapIncludes(ctx, map2.items, keyNode))
      onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
    const valueProps = resolveProps(sep != null ? sep : [], {
      indicator: "map-value-ind",
      next: value,
      offset: keyNode.range[2],
      onError,
      parentIndent: bm.indent,
      startOnNewline: !key || key.type === "block-scalar"
    });
    offset = valueProps.end;
    if (valueProps.found) {
      if (implicitKey) {
        if ((value == null ? void 0 : value.type) === "block-map" && !valueProps.hasNewline)
          onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
        if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
          onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
      }
      const valueNode = value ? composeNode2(ctx, value, valueProps, onError) : composeEmptyNode2(ctx, offset, sep, null, valueProps, onError);
      if (ctx.schema.compat)
        flowIndentCheck(bm.indent, value, onError);
      offset = valueNode.range[2];
      const pair = new Pair(keyNode, valueNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      map2.items.push(pair);
    } else {
      if (implicitKey)
        onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
      if (valueProps.comment) {
        if (keyNode.comment)
          keyNode.comment += "\n" + valueProps.comment;
        else
          keyNode.comment = valueProps.comment;
      }
      const pair = new Pair(keyNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      map2.items.push(pair);
    }
  }
  if (commentEnd && commentEnd < offset)
    onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
  map2.range = [bm.offset, offset, commentEnd != null ? commentEnd : offset];
  return map2;
}

// node_modules/yaml/browser/dist/compose/resolve-block-seq.js
function resolveBlockSeq({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, bs, onError, tag) {
  var _a;
  const NodeClass = (_a = tag == null ? void 0 : tag.nodeClass) != null ? _a : YAMLSeq;
  const seq2 = new NodeClass(ctx.schema);
  if (ctx.atRoot)
    ctx.atRoot = false;
  if (ctx.atKey)
    ctx.atKey = false;
  let offset = bs.offset;
  let commentEnd = null;
  for (const { start, value } of bs.items) {
    const props = resolveProps(start, {
      indicator: "seq-item-ind",
      next: value,
      offset,
      onError,
      parentIndent: bs.indent,
      startOnNewline: true
    });
    if (!props.found) {
      if (props.anchor || props.tag || value) {
        if ((value == null ? void 0 : value.type) === "block-seq")
          onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
        else
          onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
      } else {
        commentEnd = props.end;
        if (props.comment)
          seq2.comment = props.comment;
        continue;
      }
    }
    const node = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, start, null, props, onError);
    if (ctx.schema.compat)
      flowIndentCheck(bs.indent, value, onError);
    offset = node.range[2];
    seq2.items.push(node);
  }
  seq2.range = [bs.offset, offset, commentEnd != null ? commentEnd : offset];
  return seq2;
}

// node_modules/yaml/browser/dist/compose/resolve-end.js
function resolveEnd(end, offset, reqSpace, onError) {
  let comment = "";
  if (end) {
    let hasSpace = false;
    let sep = "";
    for (const token of end) {
      const { source, type } = token;
      switch (type) {
        case "space":
          hasSpace = true;
          break;
        case "comment": {
          if (reqSpace && !hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += sep + cb;
          sep = "";
          break;
        }
        case "newline":
          if (comment)
            sep += source;
          hasSpace = true;
          break;
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
      }
      offset += source.length;
    }
  }
  return { comment, offset };
}

// node_modules/yaml/browser/dist/compose/resolve-flow-collection.js
var blockMsg = "Block collections are not allowed within flow collections";
var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
function resolveFlowCollection({ composeNode: composeNode2, composeEmptyNode: composeEmptyNode2 }, ctx, fc, onError, tag) {
  var _a, _b, _c;
  const isMap2 = fc.start.source === "{";
  const fcName = isMap2 ? "flow map" : "flow sequence";
  const NodeClass = (_a = tag == null ? void 0 : tag.nodeClass) != null ? _a : isMap2 ? YAMLMap : YAMLSeq;
  const coll = new NodeClass(ctx.schema);
  coll.flow = true;
  const atRoot = ctx.atRoot;
  if (atRoot)
    ctx.atRoot = false;
  if (ctx.atKey)
    ctx.atKey = false;
  let offset = fc.offset + fc.start.source.length;
  for (let i = 0; i < fc.items.length; ++i) {
    const collItem = fc.items[i];
    const { start, key, sep, value } = collItem;
    const props = resolveProps(start, {
      flow: fcName,
      indicator: "explicit-key-ind",
      next: key != null ? key : sep == null ? void 0 : sep[0],
      offset,
      onError,
      parentIndent: fc.indent,
      startOnNewline: false
    });
    if (!props.found) {
      if (!props.anchor && !props.tag && !sep && !value) {
        if (i === 0 && props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        else if (i < fc.items.length - 1)
          onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
        if (props.comment) {
          if (coll.comment)
            coll.comment += "\n" + props.comment;
          else
            coll.comment = props.comment;
        }
        offset = props.end;
        continue;
      }
      if (!isMap2 && ctx.options.strict && containsNewline(key))
        onError(
          key,
          // checked by containsNewline()
          "MULTILINE_IMPLICIT_KEY",
          "Implicit keys of flow sequence pairs need to be on a single line"
        );
    }
    if (i === 0) {
      if (props.comma)
        onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
    } else {
      if (!props.comma)
        onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
      if (props.comment) {
        let prevItemComment = "";
        loop: for (const st of start) {
          switch (st.type) {
            case "comma":
            case "space":
              break;
            case "comment":
              prevItemComment = st.source.substring(1);
              break loop;
            default:
              break loop;
          }
        }
        if (prevItemComment) {
          let prev = coll.items[coll.items.length - 1];
          if (isPair(prev))
            prev = (_b = prev.value) != null ? _b : prev.key;
          if (prev.comment)
            prev.comment += "\n" + prevItemComment;
          else
            prev.comment = prevItemComment;
          props.comment = props.comment.substring(prevItemComment.length + 1);
        }
      }
    }
    if (!isMap2 && !sep && !props.found) {
      const valueNode = value ? composeNode2(ctx, value, props, onError) : composeEmptyNode2(ctx, props.end, sep, null, props, onError);
      coll.items.push(valueNode);
      offset = valueNode.range[2];
      if (isBlock(value))
        onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
    } else {
      ctx.atKey = true;
      const keyStart = props.end;
      const keyNode = key ? composeNode2(ctx, key, props, onError) : composeEmptyNode2(ctx, keyStart, start, null, props, onError);
      if (isBlock(key))
        onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
      ctx.atKey = false;
      const valueProps = resolveProps(sep != null ? sep : [], {
        flow: fcName,
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (valueProps.found) {
        if (!isMap2 && !props.found && ctx.options.strict) {
          if (sep)
            for (const st of sep) {
              if (st === valueProps.found)
                break;
              if (st.type === "newline") {
                onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                break;
              }
            }
          if (props.start < valueProps.found.offset - 1024)
            onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
        }
      } else if (value) {
        if ("source" in value && ((_c = value.source) == null ? void 0 : _c[0]) === ":")
          onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
        else
          onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
      }
      const valueNode = value ? composeNode2(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode2(ctx, valueProps.end, sep, null, valueProps, onError) : null;
      if (valueNode) {
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else if (valueProps.comment) {
        if (keyNode.comment)
          keyNode.comment += "\n" + valueProps.comment;
        else
          keyNode.comment = valueProps.comment;
      }
      const pair = new Pair(keyNode, valueNode);
      if (ctx.options.keepSourceTokens)
        pair.srcToken = collItem;
      if (isMap2) {
        const map2 = coll;
        if (mapIncludes(ctx, map2.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        map2.items.push(pair);
      } else {
        const map2 = new YAMLMap(ctx.schema);
        map2.flow = true;
        map2.items.push(pair);
        const endRange = (valueNode != null ? valueNode : keyNode).range;
        map2.range = [keyNode.range[0], endRange[1], endRange[2]];
        coll.items.push(map2);
      }
      offset = valueNode ? valueNode.range[2] : valueProps.end;
    }
  }
  const expectedEnd = isMap2 ? "}" : "]";
  const [ce, ...ee] = fc.end;
  let cePos = offset;
  if ((ce == null ? void 0 : ce.source) === expectedEnd)
    cePos = ce.offset + ce.source.length;
  else {
    const name = fcName[0].toUpperCase() + fcName.substring(1);
    const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
    onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
    if (ce && ce.source.length !== 1)
      ee.unshift(ce);
  }
  if (ee.length > 0) {
    const end = resolveEnd(ee, cePos, ctx.options.strict, onError);
    if (end.comment) {
      if (coll.comment)
        coll.comment += "\n" + end.comment;
      else
        coll.comment = end.comment;
    }
    coll.range = [fc.offset, cePos, end.offset];
  } else {
    coll.range = [fc.offset, cePos, cePos];
  }
  return coll;
}

// node_modules/yaml/browser/dist/compose/compose-collection.js
function resolveCollection(CN2, ctx, token, onError, tagName, tag) {
  const coll = token.type === "block-map" ? resolveBlockMap(CN2, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq(CN2, ctx, token, onError, tag) : resolveFlowCollection(CN2, ctx, token, onError, tag);
  const Coll = coll.constructor;
  if (tagName === "!" || tagName === Coll.tagName) {
    coll.tag = Coll.tagName;
    return coll;
  }
  if (tagName)
    coll.tag = tagName;
  return coll;
}
function composeCollection(CN2, ctx, token, props, onError) {
  var _a, _b, _c;
  const tagToken = props.tag;
  const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
  if (token.type === "block-seq") {
    const { anchor, newlineAfterProp: nl } = props;
    const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor != null ? anchor : tagToken;
    if (lastProp && (!nl || nl.offset < lastProp.offset)) {
      const message = "Missing newline after block sequence props";
      onError(lastProp, "MISSING_CHAR", message);
    }
  }
  const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
  if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.tagName && expType === "seq") {
    return resolveCollection(CN2, ctx, token, onError, tagName);
  }
  let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
  if (!tag) {
    const kt = ctx.schema.knownTags[tagName];
    if ((kt == null ? void 0 : kt.collection) === expType) {
      ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
      tag = kt;
    } else {
      if (kt) {
        onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${(_a = kt.collection) != null ? _a : "scalar"}`, true);
      } else {
        onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
      }
      return resolveCollection(CN2, ctx, token, onError, tagName);
    }
  }
  const coll = resolveCollection(CN2, ctx, token, onError, tagName, tag);
  const res = (_c = (_b = tag.resolve) == null ? void 0 : _b.call(tag, coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options)) != null ? _c : coll;
  const node = isNode(res) ? res : new Scalar(res);
  node.range = coll.range;
  node.tag = tagName;
  if (tag == null ? void 0 : tag.format)
    node.format = tag.format;
  return node;
}

// node_modules/yaml/browser/dist/compose/resolve-block-scalar.js
function resolveBlockScalar(ctx, scalar, onError) {
  const start = scalar.offset;
  const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
  if (!header)
    return { value: "", type: null, comment: "", range: [start, start, start] };
  const type = header.mode === ">" ? Scalar.BLOCK_FOLDED : Scalar.BLOCK_LITERAL;
  const lines = scalar.source ? splitLines(scalar.source) : [];
  let chompStart = lines.length;
  for (let i = lines.length - 1; i >= 0; --i) {
    const content = lines[i][1];
    if (content === "" || content === "\r")
      chompStart = i;
    else
      break;
  }
  if (chompStart === 0) {
    const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
    let end2 = start + header.length;
    if (scalar.source)
      end2 += scalar.source.length;
    return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
  }
  let trimIndent = scalar.indent + header.indent;
  let offset = scalar.offset + header.length;
  let contentStart = 0;
  for (let i = 0; i < chompStart; ++i) {
    const [indent, content] = lines[i];
    if (content === "" || content === "\r") {
      if (header.indent === 0 && indent.length > trimIndent)
        trimIndent = indent.length;
    } else {
      if (indent.length < trimIndent) {
        const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
        onError(offset + indent.length, "MISSING_CHAR", message);
      }
      if (header.indent === 0)
        trimIndent = indent.length;
      contentStart = i;
      if (trimIndent === 0 && !ctx.atRoot) {
        const message = "Block scalar values in collections must be indented";
        onError(offset, "BAD_INDENT", message);
      }
      break;
    }
    offset += indent.length + content.length + 1;
  }
  for (let i = lines.length - 1; i >= chompStart; --i) {
    if (lines[i][0].length > trimIndent)
      chompStart = i + 1;
  }
  let value = "";
  let sep = "";
  let prevMoreIndented = false;
  for (let i = 0; i < contentStart; ++i)
    value += lines[i][0].slice(trimIndent) + "\n";
  for (let i = contentStart; i < chompStart; ++i) {
    let [indent, content] = lines[i];
    offset += indent.length + content.length + 1;
    const crlf = content[content.length - 1] === "\r";
    if (crlf)
      content = content.slice(0, -1);
    if (content && indent.length < trimIndent) {
      const src = header.indent ? "explicit indentation indicator" : "first line";
      const message = `Block scalar lines must not be less indented than their ${src}`;
      onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
      indent = "";
    }
    if (type === Scalar.BLOCK_LITERAL) {
      value += sep + indent.slice(trimIndent) + content;
      sep = "\n";
    } else if (indent.length > trimIndent || content[0] === "	") {
      if (sep === " ")
        sep = "\n";
      else if (!prevMoreIndented && sep === "\n")
        sep = "\n\n";
      value += sep + indent.slice(trimIndent) + content;
      sep = "\n";
      prevMoreIndented = true;
    } else if (content === "") {
      if (sep === "\n")
        value += "\n";
      else
        sep = "\n";
    } else {
      value += sep + content;
      sep = " ";
      prevMoreIndented = false;
    }
  }
  switch (header.chomp) {
    case "-":
      break;
    case "+":
      for (let i = chompStart; i < lines.length; ++i)
        value += "\n" + lines[i][0].slice(trimIndent);
      if (value[value.length - 1] !== "\n")
        value += "\n";
      break;
    default:
      value += "\n";
  }
  const end = start + header.length + scalar.source.length;
  return { value, type, comment: header.comment, range: [start, end, end] };
}
function parseBlockScalarHeader({ offset, props }, strict, onError) {
  if (props[0].type !== "block-scalar-header") {
    onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
    return null;
  }
  const { source } = props[0];
  const mode = source[0];
  let indent = 0;
  let chomp = "";
  let error = -1;
  for (let i = 1; i < source.length; ++i) {
    const ch = source[i];
    if (!chomp && (ch === "-" || ch === "+"))
      chomp = ch;
    else {
      const n = Number(ch);
      if (!indent && n)
        indent = n;
      else if (error === -1)
        error = offset + i;
    }
  }
  if (error !== -1)
    onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
  let hasSpace = false;
  let comment = "";
  let length = source.length;
  for (let i = 1; i < props.length; ++i) {
    const token = props[i];
    switch (token.type) {
      case "space":
        hasSpace = true;
      // fallthrough
      case "newline":
        length += token.source.length;
        break;
      case "comment":
        if (strict && !hasSpace) {
          const message = "Comments must be separated from other tokens by white space characters";
          onError(token, "MISSING_CHAR", message);
        }
        length += token.source.length;
        comment = token.source.substring(1);
        break;
      case "error":
        onError(token, "UNEXPECTED_TOKEN", token.message);
        length += token.source.length;
        break;
      /* istanbul ignore next should not happen */
      default: {
        const message = `Unexpected token in block scalar header: ${token.type}`;
        onError(token, "UNEXPECTED_TOKEN", message);
        const ts = token.source;
        if (ts && typeof ts === "string")
          length += ts.length;
      }
    }
  }
  return { mode, indent, chomp, comment, length };
}
function splitLines(source) {
  const split = source.split(/\n( *)/);
  const first = split[0];
  const m = first.match(/^( *)/);
  const line0 = (m == null ? void 0 : m[1]) ? [m[1], first.slice(m[1].length)] : ["", first];
  const lines = [line0];
  for (let i = 1; i < split.length; i += 2)
    lines.push([split[i], split[i + 1]]);
  return lines;
}

// node_modules/yaml/browser/dist/compose/resolve-flow-scalar.js
function resolveFlowScalar(scalar, strict, onError) {
  const { offset, type, source, end } = scalar;
  let _type;
  let value;
  const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
  switch (type) {
    case "scalar":
      _type = Scalar.PLAIN;
      value = plainValue(source, _onError);
      break;
    case "single-quoted-scalar":
      _type = Scalar.QUOTE_SINGLE;
      value = singleQuotedValue(source, _onError);
      break;
    case "double-quoted-scalar":
      _type = Scalar.QUOTE_DOUBLE;
      value = doubleQuotedValue(source, _onError);
      break;
    /* istanbul ignore next should not happen */
    default:
      onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
      return {
        value: "",
        type: null,
        comment: "",
        range: [offset, offset + source.length, offset + source.length]
      };
  }
  const valueEnd = offset + source.length;
  const re = resolveEnd(end, valueEnd, strict, onError);
  return {
    value,
    type: _type,
    comment: re.comment,
    range: [offset, valueEnd, re.offset]
  };
}
function plainValue(source, onError) {
  let badChar = "";
  switch (source[0]) {
    /* istanbul ignore next should not happen */
    case "	":
      badChar = "a tab character";
      break;
    case ",":
      badChar = "flow indicator character ,";
      break;
    case "%":
      badChar = "directive indicator character %";
      break;
    case "|":
    case ">": {
      badChar = `block scalar indicator ${source[0]}`;
      break;
    }
    case "@":
    case "`": {
      badChar = `reserved character ${source[0]}`;
      break;
    }
  }
  if (badChar)
    onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
  return unfoldLines(source);
}
function singleQuotedValue(source, onError) {
  if (source[source.length - 1] !== "'" || source.length === 1)
    onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
  return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
}
function unfoldLines(source) {
  var _a;
  const line = /(.*?)\r?\n/sy;
  let match = line.exec(source);
  if (!match)
    return source;
  let trimEnd, trimBoth;
  try {
    trimEnd = new RegExp("(?<![ 	])[ 	]+$");
    trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
  } catch (e) {
    trimEnd = /[ \t]+$/;
    trimBoth = /^[ \t]+|[ \t]+$/g;
  }
  let res = match[1].replace(trimEnd, "");
  let sep = " ";
  let pos = line.lastIndex;
  while (match = line.exec(source)) {
    const lm = match[1].replace(trimBoth, "");
    if (lm === "") {
      if (sep === "\n")
        res += sep;
      else
        sep = "\n";
    } else {
      res += sep + lm;
      sep = " ";
    }
    pos = line.lastIndex;
  }
  const last = /[ \t]*(.*)/sy;
  last.lastIndex = pos;
  match = last.exec(source);
  return res + sep + ((_a = match == null ? void 0 : match[1]) != null ? _a : "");
}
function doubleQuotedValue(source, onError) {
  let res = "";
  for (let i = 1; i < source.length - 1; ++i) {
    const ch = source[i];
    if (ch === "\r" && source[i + 1] === "\n")
      continue;
    if (ch === "\n") {
      const { fold, offset } = foldNewline(source, i);
      res += fold;
      i = offset;
    } else if (ch === "\\") {
      let next = source[++i];
      const cc = escapeCodes[next];
      if (cc)
        res += cc;
      else if (next === "\n") {
        next = source[i + 1];
        while (next === " " || next === "	")
          next = source[++i + 1];
      } else if (next === "\r" && source[i + 1] === "\n") {
        next = source[++i + 1];
        while (next === " " || next === "	")
          next = source[++i + 1];
      } else if (next === "x" || next === "u" || next === "U") {
        const length = next === "x" ? 2 : next === "u" ? 4 : 8;
        res += parseCharCode(source, i + 1, length, onError);
        i += length;
      } else {
        const raw = source.substr(i - 1, 2);
        onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        res += raw;
      }
    } else if (ch === " " || ch === "	") {
      const wsStart = i;
      let next = source[i + 1];
      while (next === " " || next === "	")
        next = source[++i + 1];
      if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
        res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
    } else {
      res += ch;
    }
  }
  if (source[source.length - 1] !== '"' || source.length === 1)
    onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
  return res;
}
function foldNewline(source, offset) {
  let fold = "";
  let ch = source[offset + 1];
  while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
    if (ch === "\r" && source[offset + 2] !== "\n")
      break;
    if (ch === "\n")
      fold += "\n";
    offset += 1;
    ch = source[offset + 1];
  }
  if (!fold)
    fold = " ";
  return { fold, offset };
}
var escapeCodes = {
  "0": "\0",
  // null character
  a: "\x07",
  // bell character
  b: "\b",
  // backspace
  e: "\x1B",
  // escape character
  f: "\f",
  // form feed
  n: "\n",
  // line feed
  r: "\r",
  // carriage return
  t: "	",
  // horizontal tab
  v: "\v",
  // vertical tab
  N: "\x85",
  // Unicode next line
  _: "\xA0",
  // Unicode non-breaking space
  L: "\u2028",
  // Unicode line separator
  P: "\u2029",
  // Unicode paragraph separator
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  "	": "	"
};
function parseCharCode(source, offset, length, onError) {
  const cc = source.substr(offset, length);
  const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
  const code = ok ? parseInt(cc, 16) : NaN;
  try {
    return String.fromCodePoint(code);
  } catch (e) {
    const raw = source.substr(offset - 2, length + 2);
    onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
    return raw;
  }
}

// node_modules/yaml/browser/dist/compose/compose-scalar.js
function composeScalar(ctx, token, tagToken, onError) {
  const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar(ctx, token, onError) : resolveFlowScalar(token, ctx.options.strict, onError);
  const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
  let tag;
  if (ctx.options.stringKeys && ctx.atKey) {
    tag = ctx.schema[SCALAR];
  } else if (tagName)
    tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
  else if (token.type === "scalar")
    tag = findScalarTagByTest(ctx, value, token, onError);
  else
    tag = ctx.schema[SCALAR];
  let scalar;
  try {
    const res = tag.resolve(value, (msg) => onError(tagToken != null ? tagToken : token, "TAG_RESOLVE_FAILED", msg), ctx.options);
    scalar = isScalar(res) ? res : new Scalar(res);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    onError(tagToken != null ? tagToken : token, "TAG_RESOLVE_FAILED", msg);
    scalar = new Scalar(value);
  }
  scalar.range = range;
  scalar.source = value;
  if (type)
    scalar.type = type;
  if (tagName)
    scalar.tag = tagName;
  if (tag.format)
    scalar.format = tag.format;
  if (comment)
    scalar.comment = comment;
  return scalar;
}
function findScalarTagByName(schema4, value, tagName, tagToken, onError) {
  var _a;
  if (tagName === "!")
    return schema4[SCALAR];
  const matchWithTest = [];
  for (const tag of schema4.tags) {
    if (!tag.collection && tag.tag === tagName) {
      if (tag.default && tag.test)
        matchWithTest.push(tag);
      else
        return tag;
    }
  }
  for (const tag of matchWithTest)
    if ((_a = tag.test) == null ? void 0 : _a.test(value))
      return tag;
  const kt = schema4.knownTags[tagName];
  if (kt && !kt.collection) {
    schema4.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
    return kt;
  }
  onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
  return schema4[SCALAR];
}
function findScalarTagByTest({ atKey, directives, schema: schema4 }, value, token, onError) {
  var _a;
  const tag = schema4.tags.find((tag2) => {
    var _a2;
    return (tag2.default === true || atKey && tag2.default === "key") && ((_a2 = tag2.test) == null ? void 0 : _a2.test(value));
  }) || schema4[SCALAR];
  if (schema4.compat) {
    const compat = (_a = schema4.compat.find((tag2) => {
      var _a2;
      return tag2.default && ((_a2 = tag2.test) == null ? void 0 : _a2.test(value));
    })) != null ? _a : schema4[SCALAR];
    if (tag.tag !== compat.tag) {
      const ts = directives.tagString(tag.tag);
      const cs = directives.tagString(compat.tag);
      const msg = `Value may be parsed as either ${ts} or ${cs}`;
      onError(token, "TAG_RESOLVE_FAILED", msg, true);
    }
  }
  return tag;
}

// node_modules/yaml/browser/dist/compose/util-empty-scalar-position.js
function emptyScalarPosition(offset, before, pos) {
  if (before) {
    pos != null ? pos : pos = before.length;
    for (let i = pos - 1; i >= 0; --i) {
      let st = before[i];
      switch (st.type) {
        case "space":
        case "comment":
        case "newline":
          offset -= st.source.length;
          continue;
      }
      st = before[++i];
      while ((st == null ? void 0 : st.type) === "space") {
        offset += st.source.length;
        st = before[++i];
      }
      break;
    }
  }
  return offset;
}

// node_modules/yaml/browser/dist/compose/compose-node.js
var CN = { composeNode, composeEmptyNode };
function composeNode(ctx, token, props, onError) {
  const atKey = ctx.atKey;
  const { spaceBefore, comment, anchor, tag } = props;
  let node;
  let isSrcToken = true;
  switch (token.type) {
    case "alias":
      node = composeAlias(ctx, token, onError);
      if (anchor || tag)
        onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
      break;
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "block-scalar":
      node = composeScalar(ctx, token, tag, onError);
      if (anchor)
        node.anchor = anchor.source.substring(1);
      break;
    case "block-map":
    case "block-seq":
    case "flow-collection":
      try {
        node = composeCollection(CN, ctx, token, props, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onError(token, "RESOURCE_EXHAUSTION", message);
      }
      break;
    default: {
      const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
      onError(token, "UNEXPECTED_TOKEN", message);
      isSrcToken = false;
    }
  }
  node != null ? node : node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError);
  if (anchor && node.anchor === "")
    onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
  if (atKey && ctx.options.stringKeys && (!isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
    const msg = "With stringKeys, all keys must be strings";
    onError(tag != null ? tag : token, "NON_STRING_KEY", msg);
  }
  if (spaceBefore)
    node.spaceBefore = true;
  if (comment) {
    if (token.type === "scalar" && token.source === "")
      node.comment = comment;
    else
      node.commentBefore = comment;
  }
  if (ctx.options.keepSourceTokens && isSrcToken)
    node.srcToken = token;
  return node;
}
function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
  const token = {
    type: "scalar",
    offset: emptyScalarPosition(offset, before, pos),
    indent: -1,
    source: ""
  };
  const node = composeScalar(ctx, token, tag, onError);
  if (anchor) {
    node.anchor = anchor.source.substring(1);
    if (node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
  }
  if (spaceBefore)
    node.spaceBefore = true;
  if (comment) {
    node.comment = comment;
    node.range[2] = end;
  }
  return node;
}
function composeAlias({ options }, { offset, source, end }, onError) {
  const alias = new Alias(source.substring(1));
  if (alias.source === "")
    onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
  if (alias.source.endsWith(":"))
    onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
  const valueEnd = offset + source.length;
  const re = resolveEnd(end, valueEnd, options.strict, onError);
  alias.range = [offset, valueEnd, re.offset];
  if (re.comment)
    alias.comment = re.comment;
  return alias;
}

// node_modules/yaml/browser/dist/compose/compose-doc.js
function composeDoc(options, directives, { offset, start, value, end }, onError) {
  const opts = Object.assign({ _directives: directives }, options);
  const doc = new Document(void 0, opts);
  const ctx = {
    atKey: false,
    atRoot: true,
    directives: doc.directives,
    options: doc.options,
    schema: doc.schema
  };
  const props = resolveProps(start, {
    indicator: "doc-start",
    next: value != null ? value : end == null ? void 0 : end[0],
    offset,
    onError,
    parentIndent: 0,
    startOnNewline: true
  });
  if (props.found) {
    doc.directives.docStart = true;
    if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
      onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
  }
  doc.contents = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
  const contentEnd = doc.contents.range[2];
  const re = resolveEnd(end, contentEnd, false, onError);
  if (re.comment)
    doc.comment = re.comment;
  doc.range = [offset, contentEnd, re.offset];
  return doc;
}

// node_modules/yaml/browser/dist/compose/composer.js
function getErrorPos(src) {
  if (typeof src === "number")
    return [src, src + 1];
  if (Array.isArray(src))
    return src.length === 2 ? src : [src[0], src[1]];
  const { offset, source } = src;
  return [offset, offset + (typeof source === "string" ? source.length : 1)];
}
function parsePrelude(prelude) {
  var _a;
  let comment = "";
  let atComment = false;
  let afterEmptyLine = false;
  for (let i = 0; i < prelude.length; ++i) {
    const source = prelude[i];
    switch (source[0]) {
      case "#":
        comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
        atComment = true;
        afterEmptyLine = false;
        break;
      case "%":
        if (((_a = prelude[i + 1]) == null ? void 0 : _a[0]) !== "#")
          i += 1;
        atComment = false;
        break;
      default:
        if (!atComment)
          afterEmptyLine = true;
        atComment = false;
    }
  }
  return { comment, afterEmptyLine };
}
var Composer = class {
  constructor(options = {}) {
    this.doc = null;
    this.atDirectives = false;
    this.prelude = [];
    this.errors = [];
    this.warnings = [];
    this.onError = (source, code, message, warning) => {
      const pos = getErrorPos(source);
      if (warning)
        this.warnings.push(new YAMLWarning(pos, code, message));
      else
        this.errors.push(new YAMLParseError(pos, code, message));
    };
    this.directives = new Directives({ version: options.version || "1.2" });
    this.options = options;
  }
  decorate(doc, afterDoc) {
    const { comment, afterEmptyLine } = parsePrelude(this.prelude);
    if (comment) {
      const dc = doc.contents;
      if (afterDoc) {
        doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
      } else if (afterEmptyLine || doc.directives.docStart || !dc) {
        doc.commentBefore = comment;
      } else if (isCollection(dc) && !dc.flow && dc.items.length > 0) {
        let it = dc.items[0];
        if (isPair(it))
          it = it.key;
        const cb = it.commentBefore;
        it.commentBefore = cb ? `${comment}
${cb}` : comment;
      } else {
        const cb = dc.commentBefore;
        dc.commentBefore = cb ? `${comment}
${cb}` : comment;
      }
    }
    if (afterDoc) {
      for (let i = 0; i < this.errors.length; ++i)
        doc.errors.push(this.errors[i]);
      for (let i = 0; i < this.warnings.length; ++i)
        doc.warnings.push(this.warnings[i]);
    } else {
      doc.errors = this.errors;
      doc.warnings = this.warnings;
    }
    this.prelude = [];
    this.errors = [];
    this.warnings = [];
  }
  /**
   * Current stream status information.
   *
   * Mostly useful at the end of input for an empty stream.
   */
  streamInfo() {
    return {
      comment: parsePrelude(this.prelude).comment,
      directives: this.directives,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  /**
   * Compose tokens into documents.
   *
   * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
   * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
   */
  *compose(tokens, forceDoc = false, endOffset = -1) {
    for (const token of tokens)
      yield* this.next(token);
    yield* this.end(forceDoc, endOffset);
  }
  /** Advance the composer by one CST token. */
  *next(token) {
    switch (token.type) {
      case "directive":
        this.directives.add(token.source, (offset, message, warning) => {
          const pos = getErrorPos(token);
          pos[0] += offset;
          this.onError(pos, "BAD_DIRECTIVE", message, warning);
        });
        this.prelude.push(token.source);
        this.atDirectives = true;
        break;
      case "document": {
        const doc = composeDoc(this.options, this.directives, token, this.onError);
        if (this.atDirectives && !doc.directives.docStart)
          this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
        this.decorate(doc, false);
        if (this.doc)
          yield this.doc;
        this.doc = doc;
        this.atDirectives = false;
        break;
      }
      case "byte-order-mark":
      case "space":
        break;
      case "comment":
      case "newline":
        this.prelude.push(token.source);
        break;
      case "error": {
        const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
        const error = new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
        if (this.atDirectives || !this.doc)
          this.errors.push(error);
        else
          this.doc.errors.push(error);
        break;
      }
      case "doc-end": {
        if (!this.doc) {
          const msg = "Unexpected doc-end without preceding document";
          this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
          break;
        }
        this.doc.directives.docEnd = true;
        const end = resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
        this.decorate(this.doc, true);
        if (end.comment) {
          const dc = this.doc.comment;
          this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
        }
        this.doc.range[2] = end.offset;
        break;
      }
      default:
        this.errors.push(new YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
    }
  }
  /**
   * Call at end of input to yield any remaining document.
   *
   * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
   * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
   */
  *end(forceDoc = false, endOffset = -1) {
    if (this.doc) {
      this.decorate(this.doc, true);
      yield this.doc;
      this.doc = null;
    } else if (forceDoc) {
      const opts = Object.assign({ _directives: this.directives }, this.options);
      const doc = new Document(void 0, opts);
      if (this.atDirectives)
        this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
      doc.range = [0, endOffset, endOffset];
      this.decorate(doc, false);
      yield doc;
    }
  }
};

// node_modules/yaml/browser/dist/parse/cst-visit.js
var BREAK2 = Symbol("break visit");
var SKIP2 = Symbol("skip children");
var REMOVE2 = Symbol("remove item");
function visit2(cst, visitor) {
  if ("type" in cst && cst.type === "document")
    cst = { start: cst.start, value: cst.value };
  _visit(Object.freeze([]), cst, visitor);
}
visit2.BREAK = BREAK2;
visit2.SKIP = SKIP2;
visit2.REMOVE = REMOVE2;
visit2.itemAtPath = (cst, path) => {
  let item = cst;
  for (const [field2, index] of path) {
    const tok = item == null ? void 0 : item[field2];
    if (tok && "items" in tok) {
      item = tok.items[index];
    } else
      return void 0;
  }
  return item;
};
visit2.parentCollection = (cst, path) => {
  const parent = visit2.itemAtPath(cst, path.slice(0, -1));
  const field2 = path[path.length - 1][0];
  const coll = parent == null ? void 0 : parent[field2];
  if (coll && "items" in coll)
    return coll;
  throw new Error("Parent collection not found");
};
function _visit(path, item, visitor) {
  let ctrl = visitor(item, path);
  if (typeof ctrl === "symbol")
    return ctrl;
  for (const field2 of ["key", "value"]) {
    const token = item[field2];
    if (token && "items" in token) {
      for (let i = 0; i < token.items.length; ++i) {
        const ci = _visit(Object.freeze(path.concat([[field2, i]])), token.items[i], visitor);
        if (typeof ci === "number")
          i = ci - 1;
        else if (ci === BREAK2)
          return BREAK2;
        else if (ci === REMOVE2) {
          token.items.splice(i, 1);
          i -= 1;
        }
      }
      if (typeof ctrl === "function" && field2 === "key")
        ctrl = ctrl(item, path);
    }
  }
  return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
}

// node_modules/yaml/browser/dist/parse/cst.js
var BOM = "\uFEFF";
var DOCUMENT = "";
var FLOW_END = "";
var SCALAR2 = "";
function tokenType(source) {
  switch (source) {
    case BOM:
      return "byte-order-mark";
    case DOCUMENT:
      return "doc-mode";
    case FLOW_END:
      return "flow-error-end";
    case SCALAR2:
      return "scalar";
    case "---":
      return "doc-start";
    case "...":
      return "doc-end";
    case "":
    case "\n":
    case "\r\n":
      return "newline";
    case "-":
      return "seq-item-ind";
    case "?":
      return "explicit-key-ind";
    case ":":
      return "map-value-ind";
    case "{":
      return "flow-map-start";
    case "}":
      return "flow-map-end";
    case "[":
      return "flow-seq-start";
    case "]":
      return "flow-seq-end";
    case ",":
      return "comma";
  }
  switch (source[0]) {
    case " ":
    case "	":
      return "space";
    case "#":
      return "comment";
    case "%":
      return "directive-line";
    case "*":
      return "alias";
    case "&":
      return "anchor";
    case "!":
      return "tag";
    case "'":
      return "single-quoted-scalar";
    case '"':
      return "double-quoted-scalar";
    case "|":
    case ">":
      return "block-scalar-header";
  }
  return null;
}

// node_modules/yaml/browser/dist/parse/lexer.js
function isEmpty(ch) {
  switch (ch) {
    case void 0:
    case " ":
    case "\n":
    case "\r":
    case "	":
      return true;
    default:
      return false;
  }
}
var hexDigits = new Set("0123456789ABCDEFabcdef");
var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
var flowIndicatorChars = new Set(",[]{}");
var invalidAnchorChars = new Set(" ,[]{}\n\r	");
var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
var Lexer = class {
  constructor() {
    this.atEnd = false;
    this.blockScalarIndent = -1;
    this.blockScalarKeep = false;
    this.buffer = "";
    this.flowKey = false;
    this.flowLevel = 0;
    this.indentNext = 0;
    this.indentValue = 0;
    this.lineEndPos = null;
    this.next = null;
    this.pos = 0;
  }
  /**
   * Generate YAML tokens from the `source` string. If `incomplete`,
   * a part of the last line may be left as a buffer for the next call.
   *
   * @returns A generator of lexical tokens
   */
  *lex(source, incomplete = false) {
    var _a;
    if (source) {
      if (typeof source !== "string")
        throw TypeError("source is not a string");
      this.buffer = this.buffer ? this.buffer + source : source;
      this.lineEndPos = null;
    }
    this.atEnd = !incomplete;
    let next = (_a = this.next) != null ? _a : "stream";
    while (next && (incomplete || this.hasChars(1)))
      next = yield* this.parseNext(next);
  }
  atLineEnd() {
    let i = this.pos;
    let ch = this.buffer[i];
    while (ch === " " || ch === "	")
      ch = this.buffer[++i];
    if (!ch || ch === "#" || ch === "\n")
      return true;
    if (ch === "\r")
      return this.buffer[i + 1] === "\n";
    return false;
  }
  charAt(n) {
    return this.buffer[this.pos + n];
  }
  continueScalar(offset) {
    let ch = this.buffer[offset];
    if (this.indentNext > 0) {
      let indent = 0;
      while (ch === " ")
        ch = this.buffer[++indent + offset];
      if (ch === "\r") {
        const next = this.buffer[indent + offset + 1];
        if (next === "\n" || !next && !this.atEnd)
          return offset + indent + 1;
      }
      return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
    }
    if (ch === "-" || ch === ".") {
      const dt = this.buffer.substr(offset, 3);
      if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
        return -1;
    }
    return offset;
  }
  getLine() {
    let end = this.lineEndPos;
    if (typeof end !== "number" || end !== -1 && end < this.pos) {
      end = this.buffer.indexOf("\n", this.pos);
      this.lineEndPos = end;
    }
    if (end === -1)
      return this.atEnd ? this.buffer.substring(this.pos) : null;
    if (this.buffer[end - 1] === "\r")
      end -= 1;
    return this.buffer.substring(this.pos, end);
  }
  hasChars(n) {
    return this.pos + n <= this.buffer.length;
  }
  setNext(state) {
    this.buffer = this.buffer.substring(this.pos);
    this.pos = 0;
    this.lineEndPos = null;
    this.next = state;
    return null;
  }
  peek(n) {
    return this.buffer.substr(this.pos, n);
  }
  *parseNext(next) {
    switch (next) {
      case "stream":
        return yield* this.parseStream();
      case "line-start":
        return yield* this.parseLineStart();
      case "block-start":
        return yield* this.parseBlockStart();
      case "doc":
        return yield* this.parseDocument();
      case "flow":
        return yield* this.parseFlowCollection();
      case "quoted-scalar":
        return yield* this.parseQuotedScalar();
      case "block-scalar":
        return yield* this.parseBlockScalar();
      case "plain-scalar":
        return yield* this.parsePlainScalar();
    }
  }
  *parseStream() {
    let line = this.getLine();
    if (line === null)
      return this.setNext("stream");
    if (line[0] === BOM) {
      yield* this.pushCount(1);
      line = line.substring(1);
    }
    if (line[0] === "%") {
      let dirEnd = line.length;
      let cs = line.indexOf("#");
      while (cs !== -1) {
        const ch = line[cs - 1];
        if (ch === " " || ch === "	") {
          dirEnd = cs - 1;
          break;
        } else {
          cs = line.indexOf("#", cs + 1);
        }
      }
      while (true) {
        const ch = line[dirEnd - 1];
        if (ch === " " || ch === "	")
          dirEnd -= 1;
        else
          break;
      }
      const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
      yield* this.pushCount(line.length - n);
      this.pushNewline();
      return "stream";
    }
    if (this.atLineEnd()) {
      const sp = yield* this.pushSpaces(true);
      yield* this.pushCount(line.length - sp);
      yield* this.pushNewline();
      return "stream";
    }
    yield DOCUMENT;
    return yield* this.parseLineStart();
  }
  *parseLineStart() {
    const ch = this.charAt(0);
    if (!ch && !this.atEnd)
      return this.setNext("line-start");
    if (ch === "-" || ch === ".") {
      if (!this.atEnd && !this.hasChars(4))
        return this.setNext("line-start");
      const s = this.peek(3);
      if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
        yield* this.pushCount(3);
        this.indentValue = 0;
        this.indentNext = 0;
        return s === "---" ? "doc" : "stream";
      }
    }
    this.indentValue = yield* this.pushSpaces(false);
    if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
      this.indentNext = this.indentValue;
    return yield* this.parseBlockStart();
  }
  *parseBlockStart() {
    const [ch0, ch1] = this.peek(2);
    if (!ch1 && !this.atEnd)
      return this.setNext("block-start");
    if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
      const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
      this.indentNext = this.indentValue + 1;
      this.indentValue += n;
      return "block-start";
    }
    return "doc";
  }
  *parseDocument() {
    yield* this.pushSpaces(true);
    const line = this.getLine();
    if (line === null)
      return this.setNext("doc");
    let n = yield* this.pushIndicators();
    switch (line[n]) {
      case "#":
        yield* this.pushCount(line.length - n);
      // fallthrough
      case void 0:
        yield* this.pushNewline();
        return yield* this.parseLineStart();
      case "{":
      case "[":
        yield* this.pushCount(1);
        this.flowKey = false;
        this.flowLevel = 1;
        return "flow";
      case "}":
      case "]":
        yield* this.pushCount(1);
        return "doc";
      case "*":
        yield* this.pushUntil(isNotAnchorChar);
        return "doc";
      case '"':
      case "'":
        return yield* this.parseQuotedScalar();
      case "|":
      case ">":
        n += yield* this.parseBlockScalarHeader();
        n += yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - n);
        yield* this.pushNewline();
        return yield* this.parseBlockScalar();
      default:
        return yield* this.parsePlainScalar();
    }
  }
  *parseFlowCollection() {
    let nl, sp;
    let indent = -1;
    do {
      nl = yield* this.pushNewline();
      if (nl > 0) {
        sp = yield* this.pushSpaces(false);
        this.indentValue = indent = sp;
      } else {
        sp = 0;
      }
      sp += yield* this.pushSpaces(true);
    } while (nl + sp > 0);
    const line = this.getLine();
    if (line === null)
      return this.setNext("flow");
    if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
      const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
      if (!atFlowEndMarker) {
        this.flowLevel = 0;
        yield FLOW_END;
        return yield* this.parseLineStart();
      }
    }
    let n = 0;
    while (line[n] === ",") {
      n += yield* this.pushCount(1);
      n += yield* this.pushSpaces(true);
      this.flowKey = false;
    }
    n += yield* this.pushIndicators();
    switch (line[n]) {
      case void 0:
        return "flow";
      case "#":
        yield* this.pushCount(line.length - n);
        return "flow";
      case "{":
      case "[":
        yield* this.pushCount(1);
        this.flowKey = false;
        this.flowLevel += 1;
        return "flow";
      case "}":
      case "]":
        yield* this.pushCount(1);
        this.flowKey = true;
        this.flowLevel -= 1;
        return this.flowLevel ? "flow" : "doc";
      case "*":
        yield* this.pushUntil(isNotAnchorChar);
        return "flow";
      case '"':
      case "'":
        this.flowKey = true;
        return yield* this.parseQuotedScalar();
      case ":": {
        const next = this.charAt(1);
        if (this.flowKey || isEmpty(next) || next === ",") {
          this.flowKey = false;
          yield* this.pushCount(1);
          yield* this.pushSpaces(true);
          return "flow";
        }
      }
      // fallthrough
      default:
        this.flowKey = false;
        return yield* this.parsePlainScalar();
    }
  }
  *parseQuotedScalar() {
    const quote = this.charAt(0);
    let end = this.buffer.indexOf(quote, this.pos + 1);
    if (quote === "'") {
      while (end !== -1 && this.buffer[end + 1] === "'")
        end = this.buffer.indexOf("'", end + 2);
    } else {
      while (end !== -1) {
        let n = 0;
        while (this.buffer[end - 1 - n] === "\\")
          n += 1;
        if (n % 2 === 0)
          break;
        end = this.buffer.indexOf('"', end + 1);
      }
    }
    const qb = this.buffer.substring(0, end);
    let nl = qb.indexOf("\n", this.pos);
    if (nl !== -1) {
      while (nl !== -1) {
        const cs = this.continueScalar(nl + 1);
        if (cs === -1)
          break;
        nl = qb.indexOf("\n", cs);
      }
      if (nl !== -1) {
        end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
      }
    }
    if (end === -1) {
      if (!this.atEnd)
        return this.setNext("quoted-scalar");
      end = this.buffer.length;
    }
    yield* this.pushToIndex(end + 1, false);
    return this.flowLevel ? "flow" : "doc";
  }
  *parseBlockScalarHeader() {
    this.blockScalarIndent = -1;
    this.blockScalarKeep = false;
    let i = this.pos;
    while (true) {
      const ch = this.buffer[++i];
      if (ch === "+")
        this.blockScalarKeep = true;
      else if (ch > "0" && ch <= "9")
        this.blockScalarIndent = Number(ch) - 1;
      else if (ch !== "-")
        break;
    }
    return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
  }
  *parseBlockScalar() {
    let nl = this.pos - 1;
    let indent = 0;
    let ch;
    loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
      switch (ch) {
        case " ":
          indent += 1;
          break;
        case "\n":
          nl = i2;
          indent = 0;
          break;
        case "\r": {
          const next = this.buffer[i2 + 1];
          if (!next && !this.atEnd)
            return this.setNext("block-scalar");
          if (next === "\n")
            break;
        }
        // fallthrough
        default:
          break loop;
      }
    }
    if (!ch && !this.atEnd)
      return this.setNext("block-scalar");
    if (indent >= this.indentNext) {
      if (this.blockScalarIndent === -1)
        this.indentNext = indent;
      else {
        this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
      }
      do {
        const cs = this.continueScalar(nl + 1);
        if (cs === -1)
          break;
        nl = this.buffer.indexOf("\n", cs);
      } while (nl !== -1);
      if (nl === -1) {
        if (!this.atEnd)
          return this.setNext("block-scalar");
        nl = this.buffer.length;
      }
    }
    let i = nl + 1;
    ch = this.buffer[i];
    while (ch === " ")
      ch = this.buffer[++i];
    if (ch === "	") {
      while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
        ch = this.buffer[++i];
      nl = i - 1;
    } else if (!this.blockScalarKeep) {
      do {
        let i2 = nl - 1;
        let ch2 = this.buffer[i2];
        if (ch2 === "\r")
          ch2 = this.buffer[--i2];
        const lastChar = i2;
        while (ch2 === " ")
          ch2 = this.buffer[--i2];
        if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
          nl = i2;
        else
          break;
      } while (true);
    }
    yield SCALAR2;
    yield* this.pushToIndex(nl + 1, true);
    return yield* this.parseLineStart();
  }
  *parsePlainScalar() {
    const inFlow = this.flowLevel > 0;
    let end = this.pos - 1;
    let i = this.pos - 1;
    let ch;
    while (ch = this.buffer[++i]) {
      if (ch === ":") {
        const next = this.buffer[i + 1];
        if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
          break;
        end = i;
      } else if (isEmpty(ch)) {
        let next = this.buffer[i + 1];
        if (ch === "\r") {
          if (next === "\n") {
            i += 1;
            ch = "\n";
            next = this.buffer[i + 1];
          } else
            end = i;
        }
        if (next === "#" || inFlow && flowIndicatorChars.has(next))
          break;
        if (ch === "\n") {
          const cs = this.continueScalar(i + 1);
          if (cs === -1)
            break;
          i = Math.max(i, cs - 2);
        }
      } else {
        if (inFlow && flowIndicatorChars.has(ch))
          break;
        end = i;
      }
    }
    if (!ch && !this.atEnd)
      return this.setNext("plain-scalar");
    yield SCALAR2;
    yield* this.pushToIndex(end + 1, true);
    return inFlow ? "flow" : "doc";
  }
  *pushCount(n) {
    if (n > 0) {
      yield this.buffer.substr(this.pos, n);
      this.pos += n;
      return n;
    }
    return 0;
  }
  *pushToIndex(i, allowEmpty) {
    const s = this.buffer.slice(this.pos, i);
    if (s) {
      yield s;
      this.pos += s.length;
      return s.length;
    } else if (allowEmpty)
      yield "";
    return 0;
  }
  *pushIndicators() {
    let n = 0;
    loop: while (true) {
      switch (this.charAt(0)) {
        case "!":
          n += yield* this.pushTag();
          n += yield* this.pushSpaces(true);
          continue loop;
        case "&":
          n += yield* this.pushUntil(isNotAnchorChar);
          n += yield* this.pushSpaces(true);
          continue loop;
        case "-":
        // this is an error
        case "?":
        // this is an error outside flow collections
        case ":": {
          const inFlow = this.flowLevel > 0;
          const ch1 = this.charAt(1);
          if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
            if (!inFlow)
              this.indentNext = this.indentValue + 1;
            else if (this.flowKey)
              this.flowKey = false;
            n += yield* this.pushCount(1);
            n += yield* this.pushSpaces(true);
            continue loop;
          }
        }
      }
      break loop;
    }
    return n;
  }
  *pushTag() {
    if (this.charAt(1) === "<") {
      let i = this.pos + 2;
      let ch = this.buffer[i];
      while (!isEmpty(ch) && ch !== ">")
        ch = this.buffer[++i];
      return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
    } else {
      let i = this.pos + 1;
      let ch = this.buffer[i];
      while (ch) {
        if (tagChars.has(ch))
          ch = this.buffer[++i];
        else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
          ch = this.buffer[i += 3];
        } else
          break;
      }
      return yield* this.pushToIndex(i, false);
    }
  }
  *pushNewline() {
    const ch = this.buffer[this.pos];
    if (ch === "\n")
      return yield* this.pushCount(1);
    else if (ch === "\r" && this.charAt(1) === "\n")
      return yield* this.pushCount(2);
    else
      return 0;
  }
  *pushSpaces(allowTabs) {
    let i = this.pos - 1;
    let ch;
    do {
      ch = this.buffer[++i];
    } while (ch === " " || allowTabs && ch === "	");
    const n = i - this.pos;
    if (n > 0) {
      yield this.buffer.substr(this.pos, n);
      this.pos = i;
    }
    return n;
  }
  *pushUntil(test) {
    let i = this.pos;
    let ch = this.buffer[i];
    while (!test(ch))
      ch = this.buffer[++i];
    return yield* this.pushToIndex(i, false);
  }
};

// node_modules/yaml/browser/dist/parse/line-counter.js
var LineCounter = class {
  constructor() {
    this.lineStarts = [];
    this.addNewLine = (offset) => this.lineStarts.push(offset);
    this.linePos = (offset) => {
      let low = 0;
      let high = this.lineStarts.length;
      while (low < high) {
        const mid = low + high >> 1;
        if (this.lineStarts[mid] < offset)
          low = mid + 1;
        else
          high = mid;
      }
      if (this.lineStarts[low] === offset)
        return { line: low + 1, col: 1 };
      if (low === 0)
        return { line: 0, col: offset };
      const start = this.lineStarts[low - 1];
      return { line: low, col: offset - start + 1 };
    };
  }
};

// node_modules/yaml/browser/dist/parse/parser.js
function includesToken(list, type) {
  for (let i = 0; i < list.length; ++i)
    if (list[i].type === type)
      return true;
  return false;
}
function findNonEmptyIndex(list) {
  for (let i = 0; i < list.length; ++i) {
    switch (list[i].type) {
      case "space":
      case "comment":
      case "newline":
        break;
      default:
        return i;
    }
  }
  return -1;
}
function isFlowToken(token) {
  switch (token == null ? void 0 : token.type) {
    case "alias":
    case "scalar":
    case "single-quoted-scalar":
    case "double-quoted-scalar":
    case "flow-collection":
      return true;
    default:
      return false;
  }
}
function getPrevProps(parent) {
  var _a;
  switch (parent.type) {
    case "document":
      return parent.start;
    case "block-map": {
      const it = parent.items[parent.items.length - 1];
      return (_a = it.sep) != null ? _a : it.start;
    }
    case "block-seq":
      return parent.items[parent.items.length - 1].start;
    /* istanbul ignore next should not happen */
    default:
      return [];
  }
}
function getFirstKeyStartProps(prev) {
  var _a;
  if (prev.length === 0)
    return [];
  let i = prev.length;
  loop: while (--i >= 0) {
    switch (prev[i].type) {
      case "doc-start":
      case "explicit-key-ind":
      case "map-value-ind":
      case "seq-item-ind":
      case "newline":
        break loop;
    }
  }
  while (((_a = prev[++i]) == null ? void 0 : _a.type) === "space") {
  }
  return prev.splice(i, prev.length);
}
function arrayPushArray(target, source) {
  if (source.length < 1e5)
    Array.prototype.push.apply(target, source);
  else
    for (let i = 0; i < source.length; ++i)
      target.push(source[i]);
}
function fixFlowSeqItems(fc) {
  if (fc.start.type === "flow-seq-start") {
    for (const it of fc.items) {
      if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
        if (it.key)
          it.value = it.key;
        delete it.key;
        if (isFlowToken(it.value)) {
          if (it.value.end)
            arrayPushArray(it.value.end, it.sep);
          else
            it.value.end = it.sep;
        } else
          arrayPushArray(it.start, it.sep);
        delete it.sep;
      }
    }
  }
}
var Parser = class {
  /**
   * @param onNewLine - If defined, called separately with the start position of
   *   each new line (in `parse()`, including the start of input).
   */
  constructor(onNewLine) {
    this.atNewLine = true;
    this.atScalar = false;
    this.indent = 0;
    this.offset = 0;
    this.onKeyLine = false;
    this.stack = [];
    this.source = "";
    this.type = "";
    this.lexer = new Lexer();
    this.onNewLine = onNewLine;
  }
  /**
   * Parse `source` as a YAML stream.
   * If `incomplete`, a part of the last line may be left as a buffer for the next call.
   *
   * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
   *
   * @returns A generator of tokens representing each directive, document, and other structure.
   */
  *parse(source, incomplete = false) {
    if (this.onNewLine && this.offset === 0)
      this.onNewLine(0);
    for (const lexeme of this.lexer.lex(source, incomplete))
      yield* this.next(lexeme);
    if (!incomplete)
      yield* this.end();
  }
  /**
   * Advance the parser by the `source` of one lexical token.
   */
  *next(source) {
    this.source = source;
    if (this.atScalar) {
      this.atScalar = false;
      yield* this.step();
      this.offset += source.length;
      return;
    }
    const type = tokenType(source);
    if (!type) {
      const message = `Not a YAML token: ${source}`;
      yield* this.pop({ type: "error", offset: this.offset, message, source });
      this.offset += source.length;
    } else if (type === "scalar") {
      this.atNewLine = false;
      this.atScalar = true;
      this.type = "scalar";
    } else {
      this.type = type;
      yield* this.step();
      switch (type) {
        case "newline":
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine)
            this.onNewLine(this.offset + source.length);
          break;
        case "space":
          if (this.atNewLine && source[0] === " ")
            this.indent += source.length;
          break;
        case "explicit-key-ind":
        case "map-value-ind":
        case "seq-item-ind":
          if (this.atNewLine)
            this.indent += source.length;
          break;
        case "doc-mode":
        case "flow-error-end":
          return;
        default:
          this.atNewLine = false;
      }
      this.offset += source.length;
    }
  }
  /** Call at end of input to push out any remaining constructions */
  *end() {
    while (this.stack.length > 0)
      yield* this.pop();
  }
  get sourceToken() {
    const st = {
      type: this.type,
      offset: this.offset,
      indent: this.indent,
      source: this.source
    };
    return st;
  }
  *step() {
    const top = this.peek(1);
    if (this.type === "doc-end" && (top == null ? void 0 : top.type) !== "doc-end") {
      while (this.stack.length > 0)
        yield* this.pop();
      this.stack.push({
        type: "doc-end",
        offset: this.offset,
        source: this.source
      });
      return;
    }
    if (!top)
      return yield* this.stream();
    switch (top.type) {
      case "document":
        return yield* this.document(top);
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return yield* this.scalar(top);
      case "block-scalar":
        return yield* this.blockScalar(top);
      case "block-map":
        return yield* this.blockMap(top);
      case "block-seq":
        return yield* this.blockSequence(top);
      case "flow-collection":
        return yield* this.flowCollection(top);
      case "doc-end":
        return yield* this.documentEnd(top);
    }
    yield* this.pop();
  }
  peek(n) {
    return this.stack[this.stack.length - n];
  }
  *pop(error) {
    const token = error != null ? error : this.stack.pop();
    if (!token) {
      const message = "Tried to pop an empty stack";
      yield { type: "error", offset: this.offset, source: "", message };
    } else if (this.stack.length === 0) {
      yield token;
    } else {
      const top = this.peek(1);
      if (token.type === "block-scalar") {
        token.indent = "indent" in top ? top.indent : 0;
      } else if (token.type === "flow-collection" && top.type === "document") {
        token.indent = 0;
      }
      if (token.type === "flow-collection")
        fixFlowSeqItems(token);
      switch (top.type) {
        case "document":
          top.value = token;
          break;
        case "block-scalar":
          top.props.push(token);
          break;
        case "block-map": {
          const it = top.items[top.items.length - 1];
          if (it.value) {
            top.items.push({ start: [], key: token, sep: [] });
            this.onKeyLine = true;
            return;
          } else if (it.sep) {
            it.value = token;
          } else {
            Object.assign(it, { key: token, sep: [] });
            this.onKeyLine = !it.explicitKey;
            return;
          }
          break;
        }
        case "block-seq": {
          const it = top.items[top.items.length - 1];
          if (it.value)
            top.items.push({ start: [], value: token });
          else
            it.value = token;
          break;
        }
        case "flow-collection": {
          const it = top.items[top.items.length - 1];
          if (!it || it.value)
            top.items.push({ start: [], key: token, sep: [] });
          else if (it.sep)
            it.value = token;
          else
            Object.assign(it, { key: token, sep: [] });
          return;
        }
        /* istanbul ignore next should not happen */
        default:
          yield* this.pop();
          yield* this.pop(token);
      }
      if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
        const last = token.items[token.items.length - 1];
        if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
          if (top.type === "document")
            top.end = last.start;
          else
            top.items.push({ start: last.start });
          token.items.splice(-1, 1);
        }
      }
    }
  }
  *stream() {
    switch (this.type) {
      case "directive-line":
        yield { type: "directive", offset: this.offset, source: this.source };
        return;
      case "byte-order-mark":
      case "space":
      case "comment":
      case "newline":
        yield this.sourceToken;
        return;
      case "doc-mode":
      case "doc-start": {
        const doc = {
          type: "document",
          offset: this.offset,
          start: []
        };
        if (this.type === "doc-start")
          doc.start.push(this.sourceToken);
        this.stack.push(doc);
        return;
      }
    }
    yield {
      type: "error",
      offset: this.offset,
      message: `Unexpected ${this.type} token in YAML stream`,
      source: this.source
    };
  }
  *document(doc) {
    if (doc.value)
      return yield* this.lineEnd(doc);
    switch (this.type) {
      case "doc-start": {
        if (findNonEmptyIndex(doc.start) !== -1) {
          yield* this.pop();
          yield* this.step();
        } else
          doc.start.push(this.sourceToken);
        return;
      }
      case "anchor":
      case "tag":
      case "space":
      case "comment":
      case "newline":
        doc.start.push(this.sourceToken);
        return;
    }
    const bv = this.startBlockValue(doc);
    if (bv)
      this.stack.push(bv);
    else {
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML document`,
        source: this.source
      };
    }
  }
  *scalar(scalar) {
    if (this.type === "map-value-ind") {
      const prev = getPrevProps(this.peek(2));
      const start = getFirstKeyStartProps(prev);
      let sep;
      if (scalar.end) {
        sep = scalar.end;
        sep.push(this.sourceToken);
        delete scalar.end;
      } else
        sep = [this.sourceToken];
      const map2 = {
        type: "block-map",
        offset: scalar.offset,
        indent: scalar.indent,
        items: [{ start, key: scalar, sep }]
      };
      this.onKeyLine = true;
      this.stack[this.stack.length - 1] = map2;
    } else
      yield* this.lineEnd(scalar);
  }
  *blockScalar(scalar) {
    switch (this.type) {
      case "space":
      case "comment":
      case "newline":
        scalar.props.push(this.sourceToken);
        return;
      case "scalar":
        scalar.source = this.source;
        this.atNewLine = true;
        this.indent = 0;
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        yield* this.pop();
        break;
      /* istanbul ignore next should not happen */
      default:
        yield* this.pop();
        yield* this.step();
    }
  }
  *blockMap(map2) {
    var _a;
    const it = map2.items[map2.items.length - 1];
    switch (this.type) {
      case "newline":
        this.onKeyLine = false;
        if (it.value) {
          const end = "end" in it.value ? it.value.end : void 0;
          const last = Array.isArray(end) ? end[end.length - 1] : void 0;
          if ((last == null ? void 0 : last.type) === "comment")
            end == null ? void 0 : end.push(this.sourceToken);
          else
            map2.items.push({ start: [this.sourceToken] });
        } else if (it.sep) {
          it.sep.push(this.sourceToken);
        } else {
          it.start.push(this.sourceToken);
        }
        return;
      case "space":
      case "comment":
        if (it.value) {
          map2.items.push({ start: [this.sourceToken] });
        } else if (it.sep) {
          it.sep.push(this.sourceToken);
        } else {
          if (this.atIndentedComment(it.start, map2.indent)) {
            const prev = map2.items[map2.items.length - 2];
            const end = (_a = prev == null ? void 0 : prev.value) == null ? void 0 : _a.end;
            if (Array.isArray(end)) {
              arrayPushArray(end, it.start);
              end.push(this.sourceToken);
              map2.items.pop();
              return;
            }
          }
          it.start.push(this.sourceToken);
        }
        return;
    }
    if (this.indent >= map2.indent) {
      const atMapIndent = !this.onKeyLine && this.indent === map2.indent;
      const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
      let start = [];
      if (atNextItem && it.sep && !it.value) {
        const nl = [];
        for (let i = 0; i < it.sep.length; ++i) {
          const st = it.sep[i];
          switch (st.type) {
            case "newline":
              nl.push(i);
              break;
            case "space":
              break;
            case "comment":
              if (st.indent > map2.indent)
                nl.length = 0;
              break;
            default:
              nl.length = 0;
          }
        }
        if (nl.length >= 2)
          start = it.sep.splice(nl[1]);
      }
      switch (this.type) {
        case "anchor":
        case "tag":
          if (atNextItem || it.value) {
            start.push(this.sourceToken);
            map2.items.push({ start });
            this.onKeyLine = true;
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "explicit-key-ind":
          if (!it.sep && !it.explicitKey) {
            it.start.push(this.sourceToken);
            it.explicitKey = true;
          } else if (atNextItem || it.value) {
            start.push(this.sourceToken);
            map2.items.push({ start, explicitKey: true });
          } else {
            this.stack.push({
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken], explicitKey: true }]
            });
          }
          this.onKeyLine = true;
          return;
        case "map-value-ind":
          if (it.explicitKey) {
            if (!it.sep) {
              if (includesToken(it.start, "newline")) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else {
                const start2 = getFirstKeyStartProps(it.start);
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                });
              }
            } else if (it.value) {
              map2.items.push({ start: [], key: null, sep: [this.sourceToken] });
            } else if (includesToken(it.sep, "map-value-ind")) {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start, key: null, sep: [this.sourceToken] }]
              });
            } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
              const start2 = getFirstKeyStartProps(it.start);
              const key = it.key;
              const sep = it.sep;
              sep.push(this.sourceToken);
              delete it.key;
              delete it.sep;
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: start2, key, sep }]
              });
            } else if (start.length > 0) {
              it.sep = it.sep.concat(start, this.sourceToken);
            } else {
              it.sep.push(this.sourceToken);
            }
          } else {
            if (!it.sep) {
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            } else if (it.value || atNextItem) {
              map2.items.push({ start, key: null, sep: [this.sourceToken] });
            } else if (includesToken(it.sep, "map-value-ind")) {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [], key: null, sep: [this.sourceToken] }]
              });
            } else {
              it.sep.push(this.sourceToken);
            }
          }
          this.onKeyLine = true;
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const fs = this.flowScalar(this.type);
          if (atNextItem || it.value) {
            map2.items.push({ start, key: fs, sep: [] });
            this.onKeyLine = true;
          } else if (it.sep) {
            this.stack.push(fs);
          } else {
            Object.assign(it, { key: fs, sep: [] });
            this.onKeyLine = true;
          }
          return;
        }
        default: {
          const bv = this.startBlockValue(map2);
          if (bv) {
            if (bv.type === "block-seq") {
              if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                yield* this.pop({
                  type: "error",
                  offset: this.offset,
                  message: "Unexpected block-seq-ind on same line with key",
                  source: this.source
                });
                return;
              }
            } else if (atMapIndent) {
              map2.items.push({ start });
            }
            this.stack.push(bv);
            return;
          }
        }
      }
    }
    yield* this.pop();
    yield* this.step();
  }
  *blockSequence(seq2) {
    var _a;
    const it = seq2.items[seq2.items.length - 1];
    switch (this.type) {
      case "newline":
        if (it.value) {
          const end = "end" in it.value ? it.value.end : void 0;
          const last = Array.isArray(end) ? end[end.length - 1] : void 0;
          if ((last == null ? void 0 : last.type) === "comment")
            end == null ? void 0 : end.push(this.sourceToken);
          else
            seq2.items.push({ start: [this.sourceToken] });
        } else
          it.start.push(this.sourceToken);
        return;
      case "space":
      case "comment":
        if (it.value)
          seq2.items.push({ start: [this.sourceToken] });
        else {
          if (this.atIndentedComment(it.start, seq2.indent)) {
            const prev = seq2.items[seq2.items.length - 2];
            const end = (_a = prev == null ? void 0 : prev.value) == null ? void 0 : _a.end;
            if (Array.isArray(end)) {
              arrayPushArray(end, it.start);
              end.push(this.sourceToken);
              seq2.items.pop();
              return;
            }
          }
          it.start.push(this.sourceToken);
        }
        return;
      case "anchor":
      case "tag":
        if (it.value || this.indent <= seq2.indent)
          break;
        it.start.push(this.sourceToken);
        return;
      case "seq-item-ind":
        if (this.indent !== seq2.indent)
          break;
        if (it.value || includesToken(it.start, "seq-item-ind"))
          seq2.items.push({ start: [this.sourceToken] });
        else
          it.start.push(this.sourceToken);
        return;
    }
    if (this.indent > seq2.indent) {
      const bv = this.startBlockValue(seq2);
      if (bv) {
        this.stack.push(bv);
        return;
      }
    }
    yield* this.pop();
    yield* this.step();
  }
  *flowCollection(fc) {
    const it = fc.items[fc.items.length - 1];
    if (this.type === "flow-error-end") {
      let top;
      do {
        yield* this.pop();
        top = this.peek(1);
      } while ((top == null ? void 0 : top.type) === "flow-collection");
    } else if (fc.end.length === 0) {
      switch (this.type) {
        case "comma":
        case "explicit-key-ind":
          if (!it || it.sep)
            fc.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
        case "map-value-ind":
          if (!it || it.value)
            fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
          else if (it.sep)
            it.sep.push(this.sourceToken);
          else
            Object.assign(it, { key: null, sep: [this.sourceToken] });
          return;
        case "space":
        case "comment":
        case "newline":
        case "anchor":
        case "tag":
          if (!it || it.value)
            fc.items.push({ start: [this.sourceToken] });
          else if (it.sep)
            it.sep.push(this.sourceToken);
          else
            it.start.push(this.sourceToken);
          return;
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar": {
          const fs = this.flowScalar(this.type);
          if (!it || it.value)
            fc.items.push({ start: [], key: fs, sep: [] });
          else if (it.sep)
            this.stack.push(fs);
          else
            Object.assign(it, { key: fs, sep: [] });
          return;
        }
        case "flow-map-end":
        case "flow-seq-end":
          fc.end.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(fc);
      if (bv)
        this.stack.push(bv);
      else {
        yield* this.pop();
        yield* this.step();
      }
    } else {
      const parent = this.peek(2);
      if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
        yield* this.pop();
        yield* this.step();
      } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
        const prev = getPrevProps(parent);
        const start = getFirstKeyStartProps(prev);
        fixFlowSeqItems(fc);
        const sep = fc.end.splice(1, fc.end.length);
        sep.push(this.sourceToken);
        const map2 = {
          type: "block-map",
          offset: fc.offset,
          indent: fc.indent,
          items: [{ start, key: fc, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map2;
      } else {
        yield* this.lineEnd(fc);
      }
    }
  }
  flowScalar(type) {
    if (this.onNewLine) {
      let nl = this.source.indexOf("\n") + 1;
      while (nl !== 0) {
        this.onNewLine(this.offset + nl);
        nl = this.source.indexOf("\n", nl) + 1;
      }
    }
    return {
      type,
      offset: this.offset,
      indent: this.indent,
      source: this.source
    };
  }
  startBlockValue(parent) {
    switch (this.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
        return this.flowScalar(this.type);
      case "block-scalar-header":
        return {
          type: "block-scalar",
          offset: this.offset,
          indent: this.indent,
          props: [this.sourceToken],
          source: ""
        };
      case "flow-map-start":
      case "flow-seq-start":
        return {
          type: "flow-collection",
          offset: this.offset,
          indent: this.indent,
          start: this.sourceToken,
          items: [],
          end: []
        };
      case "seq-item-ind":
        return {
          type: "block-seq",
          offset: this.offset,
          indent: this.indent,
          items: [{ start: [this.sourceToken] }]
        };
      case "explicit-key-ind": {
        this.onKeyLine = true;
        const prev = getPrevProps(parent);
        const start = getFirstKeyStartProps(prev);
        start.push(this.sourceToken);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start, explicitKey: true }]
        };
      }
      case "map-value-ind": {
        this.onKeyLine = true;
        const prev = getPrevProps(parent);
        const start = getFirstKeyStartProps(prev);
        return {
          type: "block-map",
          offset: this.offset,
          indent: this.indent,
          items: [{ start, key: null, sep: [this.sourceToken] }]
        };
      }
    }
    return null;
  }
  atIndentedComment(start, indent) {
    if (this.type !== "comment")
      return false;
    if (this.indent <= indent)
      return false;
    return start.every((st) => st.type === "newline" || st.type === "space");
  }
  *documentEnd(docEnd) {
    if (this.type !== "doc-mode") {
      if (docEnd.end)
        docEnd.end.push(this.sourceToken);
      else
        docEnd.end = [this.sourceToken];
      if (this.type === "newline")
        yield* this.pop();
    }
  }
  *lineEnd(token) {
    switch (this.type) {
      case "comma":
      case "doc-start":
      case "doc-end":
      case "flow-seq-end":
      case "flow-map-end":
      case "map-value-ind":
        yield* this.pop();
        yield* this.step();
        break;
      case "newline":
        this.onKeyLine = false;
      // fallthrough
      case "space":
      case "comment":
      default:
        if (token.end)
          token.end.push(this.sourceToken);
        else
          token.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
    }
  }
};

// node_modules/yaml/browser/dist/public-api.js
function parseOptions(options) {
  const prettyErrors = options.prettyErrors !== false;
  const lineCounter = options.lineCounter || prettyErrors && new LineCounter() || null;
  return { lineCounter, prettyErrors };
}
function parseDocument(source, options = {}) {
  const { lineCounter, prettyErrors } = parseOptions(options);
  const parser = new Parser(lineCounter == null ? void 0 : lineCounter.addNewLine);
  const composer = new Composer(options);
  let doc = null;
  for (const _doc of composer.compose(parser.parse(source), true, source.length)) {
    if (!doc)
      doc = _doc;
    else if (doc.options.logLevel !== "silent") {
      doc.errors.push(new YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
      break;
    }
  }
  if (prettyErrors && lineCounter) {
    doc.errors.forEach(prettifyError(source, lineCounter));
    doc.warnings.forEach(prettifyError(source, lineCounter));
  }
  return doc;
}

// src/sync-history.ts
init_identity();
var timestamp2 = (value) => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function repairMergedTaskHistory(source) {
  const doc = parseDocument(source, { uniqueKeys: false, stringKeys: true });
  if (doc.errors.length || doc.warnings.length || !isMap(doc.contents) || !matchesEntityType(doc.get("type"), "task")) return null;
  const history = doc.get("history");
  if (!isSeq(history)) return null;
  const entries = new Set(history.items.filter(isMap));
  let changed = false;
  let ambiguous = false;
  visit(doc, {
    Map(_key, map2) {
      var _a;
      const groups = /* @__PURE__ */ new Map();
      for (const pair of map2.items) {
        if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
          ambiguous = true;
          return visit.BREAK;
        }
        const pairs2 = (_a = groups.get(pair.key.value)) != null ? _a : [];
        pairs2.push(pair);
        groups.set(pair.key.value, pairs2);
      }
      for (const [key, pairs2] of groups) {
        if (pairs2.length < 2) continue;
        const automaticMove = entries.has(map2) && map2.get("type") === "moved" && map2.get("automatic") === true && validDate(map2.get("date")) && validDate(map2.get("from")) && validDate(map2.get("to"));
        const values = pairs2.map((pair) => isScalar(pair.value) && !pair.value.anchor ? pair.value.value : void 0);
        const identical = values.every((value) => value === values[0]);
        const safe = automaticMove && (key === "at" && values.every(timestamp2) || key === "effectiveAt" && identical && timestamp2(values[0]) || key === "automatic" && identical && values[0] === true);
        if (!safe) {
          ambiguous = true;
          return visit.BREAK;
        }
        if (key === "at") {
          let earliest;
          for (const value of values) if (timestamp2(value) && (!earliest || Date.parse(value) < Date.parse(earliest))) earliest = value;
          const first = pairs2[0].value;
          if (isScalar(first)) first.value = earliest;
        }
        const duplicates = new Set(pairs2.slice(1));
        map2.items = map2.items.filter((pair) => !duplicates.has(pair));
        changed = true;
      }
    }
  });
  return changed && !ambiguous ? doc.toString() : null;
}

// src/task-order.ts
function compareTaskCreation(a, b) {
  if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  if (a.createdAt || b.createdAt) return a.createdAt ? 1 : -1;
  return a.created.localeCompare(b.created) || a.id.localeCompare(b.id);
}

// src/store.ts
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
    __publicField(this, "lastCreationTime", 0);
    settings.root = normalizeRoot(settings.root);
    settings.labelPresets = normalizeLabels(settings.labelPresets);
  }
  serial(action) {
    const next = this.queue.then(action, action);
    this.queue = next.catch(() => {
    });
    return next;
  }
  nextCreationTime() {
    this.lastCreationTime = Math.max(this.clock().getTime(), this.lastCreationTime + 1);
    return new Date(this.lastCreationTime).toISOString();
  }
  decode(text) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
    if (!match) throw new Error("\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430 Markdown");
    let data;
    try {
      data = this.codec.parse(match[1]);
    } catch (error) {
      const repaired = repairMergedTaskHistory(match[1]);
      if (repaired === null) throw error;
      data = this.codec.parse(repaired);
    }
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
    const createdAt = typeof d.createdAt === "string" && d.createdAt.includes("T") && Number.isFinite(Date.parse(d.createdAt)) ? new Date(d.createdAt).toISOString() : void 0;
    if (createdAt) this.lastCreationTime = Math.max(this.lastCreationTime, Date.parse(createdAt));
    return {
      id: str(d.id),
      path,
      title: (_a = line == null ? void 0 : line[2]) != null ? _a : str(d.title, "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F"),
      status,
      scheduled: d.scheduled,
      initialScheduled: validDate(d.initialScheduled) ? d.initialScheduled : (_c = (_b = history.find((h) => h.type === "moved" && validDate(h.from))) == null ? void 0 : _b.from) != null ? _c : d.scheduled,
      scope: pick(d.scope, ["day", "week", "month", "year"], "day"),
      priority: pick(d.priority, ["normal", "high", "low"], "normal"),
      recurrence: pick(d.recurrence, ["none", "daily", "weekdays", "weekly", "monthly", "yearly"], "none"),
      recurrenceInterval: recurrenceInterval(d.recurrenceInterval),
      goal: str(d.goal),
      labels: normalizeLabels(d.labels),
      due: validDate(d.due) ? d.due : "",
      created: validDate(d.created) ? d.created : d.scheduled,
      createdAt,
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
    result.tasks.sort(compareTaskCreation);
    result.goals.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    result.habits.sort((a, b) => a.created.localeCompare(b.created) || a.title.localeCompare(b.title, "ru"));
    return result;
  }
  async createTask(input2) {
    const title = singleLine(input2.title);
    if (!title) throw new Error("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438");
    if (!validDate(input2.scheduled) || input2.due && !validDate(input2.due)) throw new Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u0442\u0443");
    const interval = recurrenceInterval(input2.recurrenceInterval);
    if (input2.recurrence && input2.recurrence !== "none") nextOccurrence(input2.scheduled, input2.recurrence, interval);
    return this.serial(async () => {
      var _a, _b, _c, _d, _e, _f, _g;
      const id = newId();
      const path = `${this.settings.root}/tasks/${id}.md`;
      const data = { type: entityType("task"), id, title, status: "open", scheduled: input2.scheduled, initialScheduled: input2.scheduled, scope: (_a = input2.scope) != null ? _a : "day", priority: (_b = input2.priority) != null ? _b : "normal", recurrence: (_c = input2.recurrence) != null ? _c : "none", recurrenceInterval: interval, goal: (_d = input2.goal) != null ? _d : "", labels: normalizeLabels(input2.labels), due: (_e = input2.due) != null ? _e : "", created: this.now(), createdAt: this.nextCreationTime(), completed: "", history: [] };
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
      const interval = recurrenceInterval(next.recurrenceInterval);
      if (next.recurrence !== "none") nextOccurrence(next.scheduled, next.recurrence, interval);
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
        return { scheduled: nextOccurrence(today > task.scheduled ? today : task.scheduled, task.recurrence, task.recurrenceInterval), status: "open", completed: "", history: [...task.history, { type: "completed", date: today, from: task.scheduled, at: this.clock().toISOString() }] };
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
var DEFAULT_SETTINGS = { root: "_todotracking", showCompleted: true, tasksOnly: false, labelPresets: [] };

// src/task-view.ts
var ranks = { day: 0, week: 1, month: 2, year: 3 };
function carriedTask(task, scope, selected, today) {
  return task.status === "open" && ranks[task.scope] <= ranks[scope] && inPeriod(today, scope, selected) && task.scheduled < periodBounds(scope, selected).start;
}
function tasksForPeriod(tasks, scope, selected, today) {
  return tasks.filter((task) => task.status !== "cancelled" && ranks[task.scope] <= ranks[scope] && (inPeriod(task.scheduled, scope, selected) || carriedTask(task, scope, selected, today) || task.status === "done" && !!task.completed && inPeriod(task.completed, scope, selected)));
}

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
var REPEATS = { none: "\u0411\u0435\u0437 \u043F\u043E\u0432\u0442\u043E\u0440\u0430", daily: "\u041A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C", weekdays: "\u041F\u043E \u0431\u0443\u0434\u043D\u044F\u043C", weekly: "\u0420\u0430\u0437 \u0432 \u043D\u0435\u0434\u0435\u043B\u044E", monthly: "\u0420\u0430\u0437 \u0432 \u043C\u0435\u0441\u044F\u0446", yearly: "\u0420\u0430\u0437 \u0432 \u0433\u043E\u0434" };
var REPEAT_UNITS = { daily: "\u0414\u043D\u0438", weekly: "\u041D\u0435\u0434\u0435\u043B\u0438", monthly: "\u041C\u0435\u0441\u044F\u0446\u044B", yearly: "\u0413\u043E\u0434\u044B" };
function repeatLabel(task) {
  var _a;
  const n = (_a = task.recurrenceInterval) != null ? _a : 1;
  if (n === 1 || task.recurrence === "none" || task.recurrence === "weekdays") return REPEATS[task.recurrence];
  const forms = { daily: ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"], weekly: ["\u043D\u0435\u0434\u0435\u043B\u044E", "\u043D\u0435\u0434\u0435\u043B\u0438", "\u043D\u0435\u0434\u0435\u043B\u044C"], monthly: ["\u043C\u0435\u0441\u044F\u0446", "\u043C\u0435\u0441\u044F\u0446\u0430", "\u043C\u0435\u0441\u044F\u0446\u0435\u0432"], yearly: ["\u0433\u043E\u0434", "\u0433\u043E\u0434\u0430", "\u043B\u0435\u0442"] };
  const plural = new Intl.PluralRules("ru").select(n);
  return `\u0420\u0430\u0437 \u0432 ${n} ${forms[task.recurrence][plural === "one" ? 0 : plural === "few" ? 1 : 2]}`;
}
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
    __publicField(this, "lastToday", dateKey());
    __publicField(this, "calendarMonth", this.selected.slice(0, 7) + "-01");
    __publicField(this, "data", { tasks: [], goals: [], habits: [], warnings: [] });
    __publicField(this, "filter", "all");
    __publicField(this, "query", "");
    __publicField(this, "draft", "");
    __publicField(this, "calendarOpen", false);
    __publicField(this, "statsScope", "week");
    __publicField(this, "generation", 0);
    __publicField(this, "disposed", false);
    __publicField(this, "labelsNeedSave", false);
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
    const today = dateKey();
    if (this.screen === "day" && this.selected === this.lastToday) {
      this.selected = today;
      this.calendarMonth = today.slice(0, 7) + "-01";
    }
    this.lastToday = today;
    const presets = normalizeLabels([...this.store.settings.labelPresets, ...snapshot.tasks.flatMap((task) => task.labels)]);
    const presetsChanged = JSON.stringify(presets) !== JSON.stringify(this.store.settings.labelPresets);
    this.store.settings.labelPresets = presets;
    if (presetsChanged) this.labelsNeedSave = true;
    this.render();
    if (this.labelsNeedSave && this.host.persistSettings) {
      this.labelsNeedSave = false;
      try {
        await this.host.persistSettings();
      } catch (e) {
        this.labelsNeedSave = true;
        this.host.notify("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u043C\u0435\u0442\u043E\u043A. \u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438.");
      }
    }
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
    for (let i = 0; i < 42; i++) {
      const date = shiftDay(first, i);
      const node = button(String(parseDate(date).getDate()), () => this.navigate("day", date), `dl-calendar-day ${date.slice(0, 7) !== this.calendarMonth.slice(0, 7) ? "is-outside" : ""} ${date === this.selected ? "is-selected" : ""} ${date === dateKey() ? "is-today" : ""} ${tasksForPeriod(this.data.tasks, "day", date, dateKey()).length ? "has-tasks" : ""}`);
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
    return tasksForPeriod(this.data.tasks, scope, this.selected, dateKey());
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
        item.append(el("strong", "", String(parseDate(date).getDate())), el("i", tasksForPeriod(this.data.tasks, "day", date, dateKey()).some((t) => t.status === "open") ? "has-tasks" : ""));
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
    if (!visible.length) taskColumn.append(this.empty(this.query ? "\u0417\u0430\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" : "\u041D\u0435\u0442 \u0437\u0430\u0434\u0430\u0447", this.query ? "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441." : "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u0432 \u043F\u043E\u043B\u0435 \u0432\u044B\u0448\u0435."));
    else {
      const carried = visible.filter((task) => carriedTask(task, scope, this.selected, dateKey()));
      const planned = visible.filter((task) => !carriedTask(task, scope, this.selected, dateKey()));
      const appendList = (items) => {
        if (!items.length) return;
        const list = el("div", "dl-task-list");
        list.setAttribute("aria-label", "\u0417\u0430\u0434\u0430\u0447\u0438");
        items.forEach((task) => list.append(this.taskRow(task, scope !== "day")));
        taskColumn.append(list);
      };
      appendList(planned);
      if (carried.length) {
        const banner = el("div", "dl-overdue-banner");
        banner.append(el("strong", "", `${scope === "day" ? "\u041D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0441 \u043F\u0440\u043E\u0448\u043B\u044B\u0445 \u0434\u043D\u0435\u0439" : "\u041D\u0435\u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0438\u0437 \u043F\u0440\u043E\u0448\u043B\u044B\u0445 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432"} \xB7 ${carried.length}`));
        taskColumn.append(banner);
        appendList(carried);
      }
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
    const more = button("\u041F\u043E\u043B\u043D\u043E\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438", () => this.taskDialog(), "dl-icon-button dl-quick-more", "dots");
    more.title = "\u041F\u043E\u043B\u043D\u043E\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438";
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
    form.append(more, title, submit);
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
      repeat.append(icon("repeat"), el("span", "", repeatLabel(task)));
      metadata.append(repeat);
    }
    if (showDate || task.scheduled !== this.selected) metadata.append(el("span", "", `${displayDate(task.scheduled)}${task.scope !== "day" ? ` \xB7 ${SCOPES[task.scope]}` : ""}`));
    if (task.due) metadata.append(el("span", task.due < dateKey() && task.status === "open" ? "dl-late" : "", `\u0414\u043E ${displayDate(task.due)}`));
    if (task.status === "open" && task.scheduled < dateKey()) metadata.append(el("span", "dl-moved", `\u0412 \u043F\u043B\u0430\u043D\u0435 \u0441 ${displayDate(task.scheduled)}`));
    if (task.status === "done" && task.completed) metadata.append(el("span", "", `\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E ${displayDate(task.completed)}`));
    const checkTarget = el("label", "dl-checkbox-target");
    const checkMark = icon("check");
    checkMark.classList.add("dl-checkbox-mark");
    checkTarget.append(check, checkMark);
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
    const active = tasksForPeriod(this.data.tasks, this.statsScope, this.selected, dateKey()).filter((t) => t.status === "open");
    const completed = this.data.tasks.reduce((n, t) => n + (t.recurrence === "none" ? Number(t.status === "done" && inRange(t.completed)) : t.history.filter((h) => h.type === "completed" && inRange(h.date)).length), 0);
    const carried = active.filter((t) => carriedTask(t, this.statsScope, this.selected, dateKey())).length;
    const stats = el("div", "dl-stats");
    for (const [label, value] of [["\u0412 \u0440\u0430\u0431\u043E\u0442\u0435", active.length], ["\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434", completed], ["\u0421 \u043F\u0440\u043E\u0448\u043B\u044B\u0445 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432", carried]]) {
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      const form = el("form", "dl-form");
      const title = input((_a = task == null ? void 0 : task.title) != null ? _a : this.draft, "text", "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u043D\u0430\u0431\u0440\u043E\u0441\u0430\u0442\u044C \u043F\u043B\u0430\u043D \u043F\u0440\u043E\u0435\u043A\u0442\u0430");
      title.required = true;
      title.maxLength = 500;
      const scheduled = input((_b = task == null ? void 0 : task.scheduled) != null ? _b : this.selected, "date");
      scheduled.required = true;
      const customRepeat = ((_c = task == null ? void 0 : task.recurrenceInterval) != null ? _c : 1) > 1 && (task == null ? void 0 : task.recurrence) !== "none" && (task == null ? void 0 : task.recurrence) !== "weekdays";
      const scope = select(SCOPES, (_d = task == null ? void 0 : task.scope) != null ? _d : this.taskScope());
      const priority = select(PRIORITIES, (_e = task == null ? void 0 : task.priority) != null ? _e : "normal");
      const repeat = select({ ...REPEATS, custom: "\u0421\u0432\u043E\u0439 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u2026" }, customRepeat ? "custom" : (_f = task == null ? void 0 : task.recurrence) != null ? _f : "none");
      const interval = input(String((_g = task == null ? void 0 : task.recurrenceInterval) != null ? _g : 1), "number");
      interval.min = "1";
      interval.step = "1";
      interval.inputMode = "numeric";
      interval.setAttribute("aria-label", "\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u043F\u043E\u0432\u0442\u043E\u0440\u0430");
      const unit = select(REPEAT_UNITS, (task == null ? void 0 : task.recurrence) && task.recurrence in REPEAT_UNITS ? task.recurrence : "daily");
      unit.setAttribute("aria-label", "\u0415\u0434\u0438\u043D\u0438\u0446\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u0430");
      const intervalFields = el("div", "dl-repeat-interval");
      intervalFields.append(field("\u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B", interval), field("\u0415\u0434\u0438\u043D\u0438\u0446\u0430 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B\u0430", unit));
      const updateRepeat = () => {
        intervalFields.hidden = repeat.value !== "custom";
        interval.disabled = unit.disabled = intervalFields.hidden;
        interval.required = !intervalFields.hidden;
      };
      repeat.onchange = updateRepeat;
      updateRepeat();
      const goals = { "": "\u0411\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043A \u0446\u0435\u043B\u0438" };
      this.data.goals.filter((g) => g.status !== "archived" || g.id === (task == null ? void 0 : task.goal)).forEach((g) => {
        goals[g.id] = g.title;
      });
      const goal = select(goals, (_i = (_h = task == null ? void 0 : task.goal) != null ? _h : goalId) != null ? _i : "");
      const due = input((_j = task == null ? void 0 : task.due) != null ? _j : "", "date");
      const notes = textarea((_k = task == null ? void 0 : task.description) != null ? _k : "", "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0438 \u0441\u0441\u044B\u043B\u043A\u0438. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F Markdown.");
      const grid = el("div", "dl-form-grid");
      grid.append(field("\u0414\u0430\u0442\u0430 \u043F\u043B\u0430\u043D\u0430", scheduled), field("\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442", scope), field("\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442", priority), field("\u041F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u0435", repeat), field("\u0421\u0440\u043E\u043A (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", due), field("\u0426\u0435\u043B\u044C", goal));
      const labels = ((_l = task == null ? void 0 : task.labels) != null ? _l : []).map((label) => ({ ...label }));
      const labelEditor = this.labelsEditor(labels);
      form.append(field("\u0417\u0430\u0434\u0430\u0447\u0430", title), grid, intervalFields, labelEditor.element, field("\u0417\u0430\u043C\u0435\u0442\u043A\u0438", notes));
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
        const values = { title: title.value, scheduled: scheduled.value, scope: scope.value, priority: priority.value, recurrence: repeat.value === "custom" ? unit.value : repeat.value, recurrenceInterval: repeat.value === "custom" ? interval.valueAsNumber : 1, goal: goal.value, labels, due: due.value, description: notes.value };
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
    const available = normalizeLabels([...this.store.settings.labelPresets, ...this.data.tasks.flatMap((task) => task.labels)]);
    const suggestions = el("div", "dl-label-chips dl-label-suggestions");
    suggestions.setAttribute("aria-label", "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043C\u0435\u0442\u043A\u0438");
    const hint = el("span", "dl-form-hint", "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u043D\u0435\u0435");
    const render = () => {
      chips.replaceChildren();
      labels.forEach((label, index) => chips.append(button(`${label.name} \xD7`, () => {
        labels.splice(index, 1);
        render();
      }, `dl-label dl-label-${label.color}`)));
      suggestions.replaceChildren();
      for (const label of available.filter((label2) => label2.name.toLocaleLowerCase().includes(name.value.trim().toLocaleLowerCase()))) {
        const choice = button(label.name, () => {
          labels.push({ ...label });
          name.value = "";
          render();
        }, `dl-label dl-label-${label.color}`);
        choice.disabled = labels.some((selected) => selected.name.toLocaleLowerCase() === label.name.toLocaleLowerCase());
        choice.setAttribute("aria-pressed", String(choice.disabled));
        suggestions.append(choice);
      }
      hint.hidden = !suggestions.childElementCount;
    };
    const name = input("", "text", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u0435\u0442\u043A\u0438");
    name.maxLength = 60;
    name.setAttribute("aria-label", "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u0435\u0442\u043A\u0438");
    name.oninput = render;
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
    group.append(chips, controls, hint, suggestions);
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
        this.checkDay();
      }
    });
    this.registerDomEvent(window, "focus", () => {
      this.checkDay();
    });
    this.registerInterval(window.setInterval(() => {
      this.checkDay();
    }, 6e4));
    this.app.workspace.onLayoutReady(() => {
      if (!this.unloaded) {
        this.checkDay();
      }
    });
  }
  onunload() {
    this.unloaded = true;
    this.setTasksOnly(false);
    if (this.refreshTimer !== void 0) window.clearTimeout(this.refreshTimer);
  }
  report(error) {
    console.error("Smart Todo", error);
    new import_obsidian2.Notice(`Smart Todo: ${error instanceof Error ? error.message : String(error)}`, 8e3);
  }
  checkDay() {
    const today = dateKey();
    if (!this.unloaded && this.lastDay !== today) {
      this.lastDay = today;
      this.scheduleRefresh();
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
