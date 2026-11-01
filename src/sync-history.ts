import { isMap, isScalar, isSeq, parseDocument, visit, type Pair } from 'yaml';
import { validDate } from './dates';
import { matchesEntityType } from './identity';

const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

// A text merge can put several devices' execution times into one automatic
// rollover. Repair only that metadata; ambiguous changes must stay visible.
export function repairMergedTaskHistory(source: string): string | null {
  const doc = parseDocument(source, { uniqueKeys: false, stringKeys: true });
  if (doc.errors.length || doc.warnings.length || !isMap(doc.contents) || !matchesEntityType(doc.get('type'), 'task')) return null;
  const history = doc.get('history');
  if (!isSeq(history)) return null;
  const entries = new Set(history.items.filter(isMap));
  let changed = false;
  let ambiguous = false;
  visit(doc, {
    Map(_key, map) {
      const groups = new Map<string, Pair[]>();
      for (const pair of map.items) {
        if (!isScalar(pair.key) || typeof pair.key.value !== 'string') { ambiguous = true; return visit.BREAK; }
        const pairs = groups.get(pair.key.value) ?? [];
        pairs.push(pair); groups.set(pair.key.value, pairs);
      }
      for (const [key, pairs] of groups) {
        if (pairs.length < 2) continue;
        const automaticMove = entries.has(map) && map.get('type') === 'moved' && map.get('automatic') === true
          && validDate(map.get('date')) && validDate(map.get('from')) && validDate(map.get('to'));
        const values: unknown[] = pairs.map(pair => isScalar(pair.value) && !pair.value.anchor ? pair.value.value : undefined);
        const identical = values.every(value => value === values[0]);
        const safe = automaticMove && (
          (key === 'at' && values.every(timestamp)) ||
          (key === 'effectiveAt' && identical && timestamp(values[0])) ||
          (key === 'automatic' && identical && values[0] === true)
        );
        if (!safe) { ambiguous = true; return visit.BREAK; }
        if (key === 'at') {
          // Keep the first actual execution, independently of merge line order.
          let earliest: string | undefined;
          for (const value of values) if (timestamp(value) && (!earliest || Date.parse(value) < Date.parse(earliest))) earliest = value;
          const first = pairs[0]!.value;
          if (isScalar(first)) first.value = earliest;
        }
        const duplicates = new Set(pairs.slice(1));
        map.items = map.items.filter(pair => !duplicates.has(pair));
        changed = true;
      }
    },
  });
  return changed && !ambiguous ? doc.toString() : null;
}
