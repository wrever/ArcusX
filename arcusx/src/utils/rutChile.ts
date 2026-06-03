/** Utilidades RUT chileno (cuerpo + dígito verificador). */

export function cleanRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '').toUpperCase();
}

/** Formato estándar: 21873093-2 */
export function formatRutDisplay(rut: string): string {
  const c = cleanRut(rut);
  if (c.length < 2) return rut.trim();
  const body = c.slice(0, -1);
  const dv = c.slice(-1);
  return `${body}-${dv}`;
}

export function validateRut(rut: string): boolean {
  const c = cleanRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(c)) return false;
  const body = c.slice(0, -1);
  const dv = c.slice(-1);
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);
  return dv === expected;
}

/** Formatea mientras el usuario escribe (máx. 8 dígitos + DV). */
export function formatRutOnInput(raw: string): string {
  const c = cleanRut(raw).replace(/[^0-9K]/g, '');
  if (c.length === 0) return '';
  if (c.length === 1) return c;
  const maxLen = 9;
  const trimmed = c.slice(0, maxLen);
  if (trimmed.length <= 8) return trimmed;
  const body = trimmed.slice(0, -1);
  const dv = trimmed.slice(-1);
  return `${body}-${dv}`;
}

export function rutValidationMessage(rut: string, invalidMsg: string, formatMsg: string): string | null {
  const c = cleanRut(rut);
  if (c.length < 2) return null;
  if (!/^\d{7,8}[0-9K]$/.test(c)) return formatMsg;
  if (!validateRut(rut)) return invalidMsg;
  return null;
}
