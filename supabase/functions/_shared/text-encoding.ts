/** Repara UTF-8 leído como Latin-1 (ej. informÃ¡tica → informática). */
export function fixUtf8Mojibake(str: string): string {
  if (!str) return str;
  if (str.includes('Ãƒ')) return str;
  if (!/Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(str)) return str;
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const cp = str.charCodeAt(i);
      if (cp > 255) return str;
      bytes[i] = cp;
    }
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const bad = (str.match(/Ã/g) ?? []).length;
    const badFixed = (fixed.match(/Ã/g) ?? []).length;
    if (badFixed < bad) return fixed;
  } catch {
    /* keep original */
  }
  return str;
}

export function normalizeDisplayText(str: string | null | undefined): string {
  if (!str) return '';
  let s = fixUtf8Mojibake(str);
  if (s.includes('\\n')) {
    s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  }
  return s;
}

export function normalizeTextFields<T extends Record<string, unknown>>(
  row: T,
  keys: string[],
): T {
  const out = { ...row };
  for (const k of keys) {
    const v = out[k];
    if (typeof v === 'string') {
      (out as Record<string, unknown>)[k] = normalizeDisplayText(v);
    }
  }
  return out;
}
