/**
 * Detección de proveedor escrow — puente TW ↔ nativo sin tocar componentes.
 */

export type EscrowProvider = 'native' | 'trustless_work';

/** Flag global: nuevas tareas usan nativo cuando está activo. */
export function isNativeEscrowEnabled(): boolean {
  const v = import.meta.env.VITE_ESCROW_NATIVE_ENABLED;
  return v === 'true' || v === '1';
}

/**
 * Por ID on-chain:
 * - C… = Soroban (nativo v2 o Trustless Work legacy según escrow_provider)
 * - G… = legacy cuenta nativa (obsoleto, no crear nuevos)
 */
export function getEscrowProviderFromId(
  escrowId: string | null | undefined,
): EscrowProvider | null {
  if (!escrowId || typeof escrowId !== 'string') return null;
  if (escrowId.startsWith('C') && escrowId.length === 56) return 'native';
  if (escrowId.startsWith('G') && escrowId.length === 56) return 'native';
  return null;
}

/** Tarea sin escrow aún: ¿usar nativo para el próximo flujo? */
export function shouldUseNativeForNewTask(
  taskEscrowProvider?: string | null,
): boolean {
  if (taskEscrowProvider === 'native') return true;
  if (taskEscrowProvider === 'trustless_work') return false;
  return isNativeEscrowEnabled();
}

/** Tarea existente: routing por escrow_id o columna provider. */
export function shouldUseNativeEscrow(task: {
  escrow_id?: string | null;
  escrow_provider?: string | null;
}): boolean {
  const fromId = getEscrowProviderFromId(task.escrow_id);
  if (fromId === 'native') return true;
  if (fromId === 'trustless_work') return false;
  if (task.escrow_provider === 'native') return true;
  if (task.escrow_provider === 'trustless_work') return false;
  return false;
}

export function isTrustlessWorkEscrow(task: {
  escrow_id?: string | null;
  escrow_provider?: string | null;
}): boolean {
  return !shouldUseNativeEscrow(task);
}
