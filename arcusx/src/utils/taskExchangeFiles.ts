export function parseTaskExchangeFiles(files: unknown): Array<Record<string, unknown>> {
  if (!files) return [];
  let raw: unknown = files;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter((f) => f && typeof f === 'object') as Array<Record<string, unknown>>;
}

export function taskHasExchangeFiles(files: unknown): boolean {
  return parseTaskExchangeFiles(files).length > 0;
}
