import type { PlannerStore } from './store';
import { importId } from './ids';
import { entityType } from './identity';

export function legacyTasks(text: string): { title: string; line: number }[] {
  const result: { title: string; line: number }[] = []; let fence = ''; let frontmatter = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (i === 0 && line.trim() === '---') { frontmatter = true; return; }
    if (frontmatter) { if (line.trim() === '---') frontmatter = false; return; }
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) { if (!fence) fence = marker; else if (marker[0] === fence[0] && marker.length >= fence.length) fence = ''; return; }
    if (fence) return;
    const match = /^\s*[-*+] \[ \] (.+)$/.exec(line);
    if (match && !/<!-- (?:smart-todo|dayline):task -->/.test(match[1]!)) result.push({ title: match[1]!.trim(), line: i + 1 });
  }); return result;
}
export async function importLegacy(store: PlannerStore, source: string, text: string, today: string): Promise<number> {
  let count = 0;
  const candidates = legacyTasks(text);
  for (const item of candidates) {
    // Deterministic identity per source + title + occurrence survives insertion of unrelated lines.
    const duplicateIndex = candidates.filter(t => t.title === item.title && t.line < item.line).length;
    const importKey = JSON.stringify([source, item.title, duplicateIndex]); const id = importId(importKey);
    const path = `${store.settings.root}/tasks/${id}.md`;
    if (await store.storage.exists(path)) {
      const existing = await store.storage.read(path); const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(existing);
      if (frontmatter && store.codec.parse(frontmatter[1]!).importKey === importKey) continue;
      throw new Error(`Конфликт импорта: ${path}. Существующий файл сохранён.`);
    }
    const data = { type: entityType('task'), id, title: item.title, status: 'open', scheduled: today, scope: 'day', priority: 'normal', recurrence: 'none', goal: '', due: '', created: today, createdAt: store.nextCreationTime(), completed: '', history: [], source, importKey };
    const sourceLink = source.replace(/\.md$/, '');
    const body = `- [ ] ${item.title} <!-- smart-todo:task -->\n\nИсточник: [[${sourceLink}]] (строка ${item.line}).\n`;
    await store.storage.create(path, `---\n${store.codec.stringify(data).trim()}\n---\n${body}`); count++;
  }
  return count;
}
