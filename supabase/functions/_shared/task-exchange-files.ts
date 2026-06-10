/** Archivos del intercambio en arcusx_tasks.files (JSON/JSONB). */
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

export function taskHasExchangeFiles(task: { files?: unknown }): boolean {
  return parseTaskExchangeFiles(task.files).length > 0;
}
