/** Validaciones Stellar y montos (7 decimales). */

const G_ADDRESS = /^G[ABCDEFGHJKLMNPQRSTUVWXYZ234567]{55}$/;
const C_ADDRESS = /^C[ABCDEFGHJKLMNPQRSTUVWXYZ234567]{55}$/;

export function assertSorobanContractId(contractId: string, label = 'contract_id'): void {
  if (!contractId || typeof contractId !== 'string') {
    throw new Error(`${label} requerido`);
  }
  if (!C_ADDRESS.test(contractId)) {
    throw new Error(`${label} debe ser contrato Soroban C… (56 caracteres)`);
  }
}

export function assertStellarAddress(
  address: string,
  label = 'wallet',
): void {
  if (!address || typeof address !== 'string') {
    throw new Error(`${label} requerido`);
  }
  if (!G_ADDRESS.test(address)) {
    throw new Error(`${label} no es una dirección Stellar G… válida`);
  }
}

export function parseWorkerAmount(value: string | number): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('worker_amount inválido');
  }
  return n;
}

export function amountsMatch(
  a: string,
  b: string,
  epsilon = 0.0000001,
): boolean {
  return Math.abs(parseFloat(a) - parseFloat(b)) <= epsilon;
}

export function assertAmountsMatch(
  expected: string,
  actual: string,
  label: string,
): void {
  if (!amountsMatch(expected, actual)) {
    throw new Error(
      `${label} no coincide: esperado ${expected}, recibido ${actual}`,
    );
  }
}
