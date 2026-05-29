import type { EscrowStatus } from './repository.ts';

const ALLOWED: Record<EscrowStatus, EscrowStatus[]> = {
  pending_deploy: ['pending_funding', 'cancelled'],
  pending_funding: ['active', 'cancelled'],
  active: ['completed', 'disputed', 'cancelled'],
  disputed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function assertEscrowTransition(
  from: EscrowStatus,
  to: EscrowStatus,
): void {
  if (from === to) return;
  const allowed = ALLOWED[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(
      `Transición de escrow inválida: ${from} → ${to}`,
    );
  }
}

export function assertEscrowStatus(
  current: EscrowStatus,
  expected: EscrowStatus | EscrowStatus[],
): void {
  const list = Array.isArray(expected) ? expected : [expected];
  if (!list.includes(current)) {
    throw new Error(
      `Estado escrow debe ser ${list.join(' o ')}, actual: ${current}`,
    );
  }
}
