export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node;
}
export function button(label: string, onClick: () => void, className = '', iconName?: string): HTMLButtonElement {
  const node = el('button', className); node.type = 'button'; node.setAttribute('aria-label', label);
  if (iconName) node.append(icon(iconName)); node.append(el('span', '', label)); node.onclick = onClick; return node;
}
const paths: Record<string, string> = {
  sun: 'M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  week: 'M4 4h16v16H4zM4 9h16M9 9v11M15 9v11',
  month: 'M4 4h16v16H4zM4 9h16M8 13h1m3 0h1m3 0h1M8 17h1m3 0h1m3 0h1',
  year: 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z',
  target: 'M21 12a9 9 0 1 1-9-9m5 0v4h4m-4 0-5 5m4 0a4 4 0 1 1-4-4',
  leaf: 'M20 3C9 2 3 7 5 15c2 7 13 6 15-12ZM4 21l10-10',
  plus: 'M12 5v14M5 12h14',
  left: 'm15 18-6-6 6-6', right: 'm9 18 6-6-6-6',
  check: 'm5 12 4 4L19 6', arrow: 'M5 12h14m-5-5 5 5-5 5',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8m-8 4h6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  repeat: 'm17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3',
  move: 'M5 5h14v14H5zM8 12h8m-3-3 3 3-3 3',
  close: 'm6 6 12 12M6 18 18 6',
  sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  folder: 'M3 7V4h6l2 3h10v13H3Z',
};
export function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] ?? paths.sun!); svg.append(path); return svg;
}
export function field(label: string, input: HTMLElement): HTMLLabelElement { const wrap = el('label', 'dl-field'); wrap.append(el('span', 'dl-field-label', label), input); return wrap; }
export function input(value = '', type = 'text', placeholder = ''): HTMLInputElement { const node = el('input', 'dl-input'); node.type = type; node.value = value; node.placeholder = placeholder; return node; }
export function select(options: Record<string, string>, value: string): HTMLSelectElement { const node = el('select', 'dl-input'); for (const [key, label] of Object.entries(options)) { const option = el('option', '', label); option.value = key; node.append(option); } node.value = value; return node; }
export function textarea(value: string, placeholder = ''): HTMLTextAreaElement { const node = el('textarea', 'dl-input'); node.value = value; node.rows = 4; node.placeholder = placeholder; return node; }
export function meter(value: number, className = ''): HTMLElement { const node = el('div', `dl-meter ${className}`); node.setAttribute('role', 'progressbar'); node.setAttribute('aria-label', 'Выполнено'); node.setAttribute('aria-valuenow', String(Math.round(value))); node.setAttribute('aria-valuemin', '0'); node.setAttribute('aria-valuemax', '100'); const fill = el('span'); fill.style.width = `${Math.max(0, Math.min(100, value))}%`; node.append(fill); return node; }
