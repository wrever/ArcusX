export function cleanRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/\s/g, '').replace(/-/g, '').toUpperCase();
}

export function formatRutDisplay(rut: string): string {
  const c = cleanRut(rut);
  if (c.length < 2) return rut.trim();
  return `${c.slice(0, -1)}-${c.slice(-1)}`;
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
