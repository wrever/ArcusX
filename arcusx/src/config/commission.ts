/**
 * Configuración de comisiones de ArcusX
 * 
 * La comisión se obtiene del backend y puede ser configurada desde el admin panel
 * La comisión se retiene en el escrow y puede ser retirada manualmente
 */

// Valor por defecto ArcusX (1.7%); + 0.3% operación → 2% total al trabajador
export const DEFAULT_COMMISSION_RATE = 0.017;

/**
 * Calcula la comisión sobre un monto dado usando el fee del backend
 * @param amount Monto total en USDC
 * @param commissionRate Opcional: tasa de comisión como decimal (ej: 0.03 para 3%). Si no se proporciona, se obtiene del backend
 * @returns Comisión calculada con 7 decimales
 */
export async function calculateCommission(amount: number, commissionRate?: number): Promise<number> {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }
  
  let rate = commissionRate;
  if (rate === undefined) {
    // Obtener del backend
    const { getPlatformFee } = await import('../services/platformFeeService');
    rate = await getPlatformFee();
  }
  
  const commission = amount * rate;
  return parseFloat(commission.toFixed(7));
}

/**
 * Calcula la comisión sobre un monto dado (versión síncrona con rate proporcionado)
 * @param amount Monto total en USDC
 * @param commissionRate Tasa de comisión como decimal (ej: 0.03 para 3%)
 * @returns Comisión calculada con 7 decimales
 */
export function calculateCommissionSync(amount: number, commissionRate: number = DEFAULT_COMMISSION_RATE): number {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }
  const commission = amount * commissionRate;
  return parseFloat(commission.toFixed(7));
}

/**
 * Calcula el monto neto que recibirá el trabajador (después de deducir la comisión)
 * @param amount Monto total en USDC
 * @param commissionRate Opcional: tasa de comisión como decimal. Si no se proporciona, se obtiene del backend
 * @returns Monto neto (monto total - comisión) con 7 decimales
 */
export async function calculateNetAmount(amount: number, commissionRate?: number): Promise<number> {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }
  const commission = await calculateCommission(amount, commissionRate);
  const netAmount = amount - commission;
  return parseFloat(netAmount.toFixed(7));
}

/**
 * Calcula el monto neto que recibirá el trabajador (versión síncrona con rate proporcionado)
 * @deprecated Esta función calcula el monto neto restando comisión. 
 * En el nuevo modelo, el trabajador recibe el monto exacto ingresado.
 * Se mantiene para compatibilidad con código legacy.
 * @param amount Monto total en USDC
 * @param commissionRate Tasa de comisión como decimal (ej: 0.03 para 3%)
 * @returns Monto neto (monto total - comisión) con 7 decimales
 */
export function calculateNetAmountSync(amount: number, commissionRate: number = DEFAULT_COMMISSION_RATE): number {
  if (isNaN(amount) || amount <= 0) {
    return 0;
  }
  const commission = calculateCommissionSync(amount, commissionRate);
  const netAmount = amount - commission;
  return parseFloat(netAmount.toFixed(7));
}

/**
 * Calcula el total que debe pagar el cliente (workerAmount + commission)
 * @param workerAmount Monto que recibirá el trabajador
 * @param commissionRate Tasa de comisión como decimal (ej: 0.03 para 3%)
 * @returns Total a pagar (workerAmount + commission) con 7 decimales
 */
export function calculateTotalWithCommission(
  workerAmount: number, 
  commissionRate: number = DEFAULT_COMMISSION_RATE
): number {
  if (isNaN(workerAmount) || workerAmount <= 0) {
    return 0;
  }
  const commission = workerAmount * commissionRate;
  const total = workerAmount + commission;
  return parseFloat(total.toFixed(7));
}

/**
 * Calcula la comisión que se cobrará al cliente sobre el monto del trabajador
 * @param workerAmount Monto que recibirá el trabajador
 * @param commissionRate Tasa de comisión como decimal (ej: 0.03 para 3%)
 * @returns Comisión calculada con 7 decimales
 */
export function calculateCommissionFromWorkerAmount(
  workerAmount: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): number {
  if (isNaN(workerAmount) || workerAmount <= 0) {
    return 0;
  }
  const commission = workerAmount * commissionRate;
  return parseFloat(commission.toFixed(7));
}

