import type { Codec, Storage } from '../src/types';
export const codec: Codec = {
  parse: text => JSON.parse(text), stringify: data => JSON.stringify(data, null, 2),
};
export class MemoryStorage implements Storage {
  files = new Map<string, string>();
  trashed = new Map<string, string>();
  list(): string[] { return [...this.files.keys()]; }
  exists(path: string): boolean { return this.files.has(path); }
  async read(path: string): Promise<string> { const text = this.files.get(path); if (text === undefined) throw new Error('Missing file: ' + path); return text; }
  async create(path: string, content: string): Promise<void> { if (this.files.has(path)) throw new Error('File exists'); this.files.set(path, content); }
  async process(path: string, update: (text: string) => string): Promise<void> { this.files.set(path, update(await this.read(path))); }
  failMove = '';
  async move(from: string, to: string): Promise<void> { if (from === this.failMove) throw new Error('Simulated I/O failure'); if (this.exists(to)) throw new Error('Conflict'); this.files.set(to, await this.read(from)); this.files.delete(from); }
  async trash(path: string): Promise<void> { this.trashed.set(path, await this.read(path)); this.files.delete(path); }
}
