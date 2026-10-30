import { describe, it, expect } from 'vitest';
import { importId, newId } from '../src/ids';
describe('mobile-compatible identifiers', () => {
  it('generates UUID v4 using getRandomValues', () => {
    const ids = Array.from({ length: 100 }, newId);
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('fingerprints source keys deterministically, including Unicode', () => {
    expect(importId('Заметка.md\nДело')).toBe(importId('Заметка.md\nДело'));
    expect(importId('Заметка.md\nДело')).not.toBe(importId('Заметка.md\nДело 2'));
    expect(importId('One')).toMatch(/^import-[0-9a-f]{32}$/);
  });
});
