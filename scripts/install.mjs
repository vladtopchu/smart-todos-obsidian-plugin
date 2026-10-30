import { mkdir, copyFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argument = process.argv.indexOf('--vault');
if (argument < 0 || !process.argv[argument + 1]) { console.error('Использование: npm run install-plugin -- --vault "/абсолютный/путь/к/vault"'); process.exit(1); }
const vault = path.resolve(process.argv[argument + 1]);
if (!(await stat(path.join(vault, '.obsidian')).catch(() => null))?.isDirectory()) { console.error('Не найден каталог .obsidian: укажите корень существующего хранилища.'); process.exit(1); }
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const destination = path.join(vault, '.obsidian', 'plugins', manifest.id);
const filenames = ['main.js', 'manifest.json', 'styles.css'];
for (const name of filenames) if (!(await stat(path.join(root, name)).catch(() => null))?.isFile()) { console.error('Сначала выполните npm run build'); process.exit(1); }
const backup = path.join(root, 'dist', 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
for (const name of filenames) {
  const existing = path.join(destination, name);
  if ((await stat(existing).catch(() => null))?.isFile()) { await mkdir(backup, { recursive: true }); await copyFile(existing, path.join(backup, name)); }
}
await mkdir(destination, { recursive: true });
for (const name of filenames) await copyFile(path.join(root, name), path.join(destination, name));
console.log(`Установлено: ${destination}\nВ Obsidian включите Dayline в Settings → Community plugins. Если плагин не появился, перезапустите Obsidian.\nНастройки data.json и заметки хранилища сохранены.`);
