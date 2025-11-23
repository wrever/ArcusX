/**
 * Configuración de comisiones de ArcusX
 * 
 * Comisión: 0.3% del monto total depositado
 * La comisión se retiene en el escrow y puede ser retirada manualmente
 */

export const COMMISSION_RATE = 0.003; // 0.3%

/**
 * Calcula la comisión sobre un monto dado
 * @param amount Monto total en XLM
 * @returns Comisión calculada (0.3% del monto) con 7 decimales
 */
export function calculateCommission(amount: number): number {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }
  const commission = amount * COMMISSION_RATE;
  return parseFloat(commission.toFixed(7));
}

/**
 * Calcula el monto neto que recibirá el trabajador (después de deducir la comisión)
 * @param amount Monto total en XLM
 * @returns Monto neto (monto total - comisión) con 7 decimales
 */
export function calculateNetAmount(amount: number): number {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }
  const commission = calculateCommission(amount);
  const netAmount = amount - commission;
  return parseFloat(netAmount.toFixed(7));
}

