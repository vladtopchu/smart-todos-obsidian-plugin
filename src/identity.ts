import manifest from '../manifest.json';

export const PLUGIN_ID = manifest.id;
export const PLUGIN_NAME = manifest.name;
export function entityType(kind: string): string { return `smart-todo-${kind}`; }
/** Recognize our original Markdown schema without claiming the old registry ID. */
export function matchesEntityType(value: unknown, kind: string): boolean {
  return value === entityType(kind) || value === `dayline-${kind}`;
}
