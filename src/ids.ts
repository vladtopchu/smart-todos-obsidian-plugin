/** getRandomValues also works in mobile WebViews without secure-context-only randomUUID. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** Non-cryptographic filename fingerprint. The full key is checked before deduplication. */
export function importId(key: string): string {
  const bytes = new TextEncoder().encode(key);
  return 'import-' + [0x811c9dc5, 0xa24baed5, 0x9e3779b9, 0x85ebca6b].map((seed, index) => {
    let hash = seed;
    for (const byte of bytes) { hash ^= byte; hash = Math.imul(hash, 0x01000193 + index * 2); hash ^= hash >>> 13; }
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    return ((hash ^ (hash >>> 16)) >>> 0).toString(16).padStart(8, '0');
  }).join('');
}
