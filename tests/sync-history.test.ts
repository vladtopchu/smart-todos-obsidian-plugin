import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { repairMergedTaskHistory } from '../src/sync-history';
import { PlannerStore } from '../src/store';
import { DEFAULT_SETTINGS } from '../src/types';
import { MemoryStorage } from './helpers';

const merged = `type: smart-todo-task
id: synced-task
title: Synced task
status: open
scheduled: 2026-11-01
initialScheduled: 2026-10-31
custom:
  nested: keep me
history:
  - type: moved
    date: 2026-11-01
    from: 2026-10-31
    to: 2026-11-01
    at: 2026-11-01T09:07:40.968Z
    at: 2026-11-01T14:52:51.954Z
    at: 2026-11-01T09:16:08.102Z
    effectiveAt: 2026-11-01T09:00:00.000Z
    effectiveAt: 2026-11-01T09:00:00.000Z
    automatic: true
    automatic: true
`;

describe('LiveSync merged rollover history', () => {
  it.each(['smart-todo-task', 'dayline-task'])('recovers %s metadata and keeps the earliest actual execution', type => {
    const source = merged.replace('smart-todo-task', type);
    expect(() => parse(source)).toThrow('Map keys must be unique');
    const repaired = repairMergedTaskHistory(source)!;
    expect(parse(repaired)).toMatchObject({
      type, custom: { nested: 'keep me' }, initialScheduled: '2026-10-31',
      history: [{ type: 'moved', date: '2026-11-01', from: '2026-10-31', to: '2026-11-01', at: '2026-11-01T09:07:40.968Z', effectiveAt: '2026-11-01T09:00:00.000Z', automatic: true }],
    });
    expect(repairMergedTaskHistory(repaired)).toBeNull();
  });

  it('selects execution time chronologically regardless of merge order', () => {
    const source = merged.replace('at: 2026-11-01T09:07:40.968Z', 'at: 2026-11-01T19:00:00.000Z');
    expect(parse(repairMergedTaskHistory(source)!).history[0].at).toBe('2026-11-01T09:16:08.102Z');
  });

  it.each([
    merged.replace('automatic: true\n    automatic: true', 'automatic: true\n    automatic: false'),
    merged.replace('effectiveAt: 2026-11-01T09:00:00.000Z', 'effectiveAt: 2026-11-01T10:00:00.000Z'),
    merged.replace('at: 2026-11-01T14:52:51.954Z', 'at: invalid'),
    merged.replace('    from: 2026-10-31', '    from: 2026-10-31\n    from: 2026-10-30'),
    merged.replace('status: open', 'status: open\nstatus: done'),
    merged.replace('nested: keep me', 'nested: keep me\n  nested: another value'),
    merged.replace('type: smart-todo-task', 'type: other-task'),
    merged.replaceAll('automatic: true', 'automatic: false'),
    merged.replace('type: moved', 'type: completed'),
    merged + 'bad: [unterminated\n',
  ])('leaves ambiguous conflicts and other YAML errors for manual review (%#)', source => {
    expect(repairMergedTaskHistory(source)).toBeNull();
  });

  it('handles flow mappings without treating a multiline string as history metadata', () => {
    const source = `type: smart-todo-task
id: flow-task
description: |
  at: first line
  at: second line
history:
  - { type: moved, date: 2026-11-01, from: 2026-10-31, to: 2026-11-01, automatic: true, at: 2026-11-01T10:00:00.000Z, at: 2026-11-01T09:00:00.000Z }
`;
    expect(parse(repairMergedTaskHistory(source)!)).toMatchObject({ description: 'at: first line\nat: second line\n', history: [{ at: '2026-11-01T09:00:00.000Z' }] });
  });

  it('reads recovered tasks without writing on snapshot, then persists valid YAML on an edit', async () => {
    const storage = new MemoryStorage();
    const store = new PlannerStore(storage, { parse, stringify }, { ...DEFAULT_SETTINGS }, () => '2026-11-01');
    const path = '_todotracking/tasks/synced-task.md';
    const body = '- [ ] Synced task <!-- smart-todo:task -->\n\n[[My link]]\n- [ ] Subtask\n';
    const original = `---\n${merged}---\n${body}`;
    storage.files.set(path, original);
    storage.files.set('_todotracking/tasks/ambiguous.md', original.replace('status: open', 'status: open\nstatus: done'));
    const snapshot = await store.snapshot();
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.tasks[0]).toMatchObject({ path, scheduled: '2026-11-01', initialScheduled: '2026-10-31', history: [{ at: '2026-11-01T09:07:40.968Z' }] });
    expect(snapshot.warnings).toHaveLength(1);
    expect(snapshot.warnings[0]).toContain('ambiguous.md');
    expect(await storage.read(path)).toBe(original);
    await store.setTaskStatus(path, 'done');
    const saved = await storage.read(path);
    const data = parse(saved.split('---')[1]!);
    expect(data.custom).toEqual({ nested: 'keep me' });
    expect(data.history).toHaveLength(2);
    expect(data.history[0].at).toBe('2026-11-01T09:07:40.968Z');
    expect(saved.slice(saved.indexOf('---', 3) + 4)).toBe(body.replace('- [ ] Synced task', '- [x] Synced task'));
  });
});
