import { App, normalizePath, TFile, TFolder } from 'obsidian';
import type { Storage } from './types';

export class ObsidianStorage implements Storage {
  constructor(private app: App) {}
  list(): string[] { return this.app.vault.getFiles().map(f => f.path); }
  private file(path: string): TFile {
    const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (!(file instanceof TFile)) throw new Error(`Файл не найден: ${path}`);
    return file;
  }
  read(path: string): Promise<string> { return this.app.vault.read(this.file(path)); }
  exists(path: string): boolean { return this.app.vault.getAbstractFileByPath(normalizePath(path)) !== null; }
  private async parents(path: string): Promise<void> {
    const pieces = normalizePath(path).split('/'); pieces.pop(); let parent = '';
    for (const piece of pieces) {
      parent = parent ? `${parent}/${piece}` : piece;
      const existing = this.app.vault.getAbstractFileByPath(parent);
      if (existing && !(existing instanceof TFolder)) throw new Error(`Вместо папки существует файл: ${parent}`);
      if (!existing) {
        try { await this.app.vault.createFolder(parent); }
        catch (error) { if (!(this.app.vault.getAbstractFileByPath(parent) instanceof TFolder)) throw error; }
      }
    }
  }
  async create(path: string, content: string): Promise<void> { await this.parents(path); await this.app.vault.create(normalizePath(path), content); }
  async process(path: string, update: (content: string) => string): Promise<void> { await this.app.vault.process(this.file(path), update); }
  async move(from: string, to: string): Promise<void> { await this.parents(to); await this.app.fileManager.renameFile(this.file(from), normalizePath(to)); }
  async trash(path: string): Promise<void> { await this.app.vault.trash(this.file(path), false); }
}
