/**
 * Repara UTF-8 leído como Latin-1 (ej. "PeÃ±a" → "Peña", "tÃ©cnico" → "técnico").
 * Alineado con fix_utf8_mojibake en backend_externo/config.php.
 *
 * Usa sustitución por pares (C2/C3 + byte de continuación UTF-8) para no abortar
 * cuando hay emojis (surrogates) o texto ya correcto mezclado con mojibake.
 */
const TRIPLE_MOJIBAKE_MARK = '\u00C3\u0192';

function decodeTwoByteMojibake(str: string, leadByte: number): string {
  const lead = String.fromCharCode(leadByte);
  const re = new RegExp(`${lead}([\\u0080-\\u00BF])`, 'g');
  return str.replace(re, (full, cont: string) => {
    const b2 = cont.charCodeAt(0);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array([leadByte, b2]));
    } catch {
      return full;
    }
  });
}

/** Pasa C2/C3 en bucle por si quedan secuencias tras otra ronda. */
function decodeAllMojibakePairs(str: string): string {
  let prev = str;
  for (let i = 0; i < 4; i++) {
    let next = decodeTwoByteMojibake(prev, 0xc3);
    next = decodeTwoByteMojibake(next, 0xc2);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

function legacyWholeStringRecover(str: string): string {
  if (!/\u00C3[\u0080-\u00BF]/.test(str) && !/\u00C2[\u0080-\u00BF]/.test(str)) {
    return str;
  }
  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const cp = str.charCodeAt(i);
      if (cp > 255) {
        return str;
      }
      bytes[i] = cp;
    }
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    let bad = 0;
    let badFixed = 0;
    for (let j = 0; j < str.length; j++) {
      if (str.charCodeAt(j) === 0xc3) bad++;
    }
    for (let j = 0; j < fixed.length; j++) {
      if (fixed.charCodeAt(j) === 0xc3) badFixed++;
    }
    if (badFixed < bad) {
      return fixed;
    }
  } catch {
    return str;
  }
  return str;
}

export function recoverUtf8Mojibake(str: string): string {
  if (!str) {
    return str;
  }
  if (str.includes(TRIPLE_MOJIBAKE_MARK)) {
    return str;
  }
  const paired = decodeAllMojibakePairs(str);
  return legacyWholeStringRecover(paired);
}
