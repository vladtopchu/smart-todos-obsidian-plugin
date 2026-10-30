import type { LabelColor, TaskLabel } from './types';

export const LABEL_COLORS: Record<LabelColor, string> = { gray: 'Серый', red: 'Красный', orange: 'Оранжевый', green: 'Зелёный', blue: 'Синий', purple: 'Фиолетовый' };
export function normalizeLabels(value: unknown): TaskLabel[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>(); const labels: TaskLabel[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string') continue;
    const name = item.name.replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
    if (!name || seen.has(name.toLocaleLowerCase())) continue;
    seen.add(name.toLocaleLowerCase());
    labels.push({ name, color: Object.hasOwn(LABEL_COLORS, item.color) ? item.color as LabelColor : 'gray' });
  }
  return labels;
}
