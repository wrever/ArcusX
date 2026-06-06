import type { DealEscrowHooks } from '../services/dealEscrow';

export type DealEscrowIndexerRow = {
  balance?: string | number;
  status?: string;
  funded?: boolean;
  milestones?: Array<{
    approved?: boolean;
    status?: string;
    state?: string;
  }>;
  flags?: { approved?: boolean };
};

export async function fetchDealEscrowFromIndexer(
  contractId: string,
  getEscrowByContractIds: DealEscrowHooks['getEscrowByContractIds'],
): Promise<DealEscrowIndexerRow | null> {
  if (!contractId) return null;
  try {
    const result = await getEscrowByContractIds({
      contractIds: [contractId],
      validateOnChain: true,
    });
    const escrows = Array.isArray(result)
      ? result
      : (result as { escrows?: unknown[] })?.escrows ?? [];
    if (!escrows?.length) return null;
    return escrows[0] as DealEscrowIndexerRow;
  } catch {
    return null;
  }
}

export function isDealEscrowFunded(escrow: DealEscrowIndexerRow | null): boolean {
  if (!escrow) return false;
  const balance = parseFloat(String(escrow.balance ?? 0));
  if (balance > 0) return true;
  const status = String(escrow.status ?? '').toLowerCase();
  return status === 'funded' || status === 'active' || escrow.funded === true;
}

export function isDealMilestoneApproved(escrow: DealEscrowIndexerRow | null): boolean {
  if (!escrow) return false;
  const milestones = escrow.milestones;
  if (Array.isArray(milestones) && milestones.length > 0) {
    const m = milestones[0];
    return m.approved === true || m.status === 'approved' || m.state === 'approved';
  }
  return escrow.flags?.approved === true;
}

export function isDealEscrowReleased(escrow: DealEscrowIndexerRow | null): boolean {
  if (!escrow) return false;
  const status = String(escrow.status ?? '').toLowerCase();
  return status === 'released' || status === 'completed';
}

/** Contrato desplegado en indexer (aunque aún sin fondos). */
export function isDealContractOnChain(escrow: DealEscrowIndexerRow | null): boolean {
  return escrow != null;
}

type EscrowRoleRow = {
  approver?: string;
  releaseSigner?: string;
  release_signer?: string;
  serviceProvider?: string;
  service_provider?: string;
  receiver?: string;
  roles?: {
    approver?: string;
    releaseSigner?: string;
    release_signer?: string;
    serviceProvider?: string;
    service_provider?: string;
    receiver?: string;
  };
};

function normStellar(addr: string): string {
  return addr.trim();
}

function roleAddr(row: EscrowRoleRow, key: 'approver' | 'releaseSigner' | 'receiver'): string {
  const snake =
    key === 'releaseSigner' ? 'release_signer' : key === 'approver' ? 'approver' : 'receiver';
  const flat = row[key as keyof EscrowRoleRow];
  if (typeof flat === 'string' && flat.trim()) return normStellar(flat);
  const fromRoles = row.roles?.[key] ?? (row.roles as Record<string, string> | undefined)?.[snake];
  if (typeof fromRoles === 'string' && fromRoles.trim()) return normStellar(fromRoles);
  const snakeFlat = row[snake as keyof EscrowRoleRow];
  if (typeof snakeFlat === 'string' && snakeFlat.trim()) return normStellar(snakeFlat);
  return '';
}

/** Roles on-chain del escrow (tasks y deals). */
export function extractEscrowRoles(escrow: DealEscrowIndexerRow): {
  approver: string;
  releaseSigner: string;
  receiver: string;
} {
  const row = escrow as EscrowRoleRow;
  const nested = row.roles ?? {};
  return {
    approver: roleAddr(row, 'approver') || normStellar(String(nested.approver ?? '')),
    releaseSigner:
      roleAddr(row, 'releaseSigner') ||
      normStellar(String(nested.releaseSigner ?? nested.release_signer ?? '')),
    receiver: roleAddr(row, 'receiver') || normStellar(String(nested.receiver ?? '')),
  };
}

/** Valida que el indexer refleje comprador=libera, vendedor=cobra (comercio). */
export function validateCommerceEscrowRoles(
  escrow: DealEscrowIndexerRow | null,
  expected: { buyer: string; seller: string },
): string | null {
  if (!escrow) {
    return 'El contrato aún no aparece en el indexer. Espera unos segundos y vuelve a intentar fondear.';
  }
  const buyer = normStellar(expected.buyer);
  const seller = normStellar(expected.seller);
  const { approver, releaseSigner, receiver } = extractEscrowRoles(escrow);

  if (!releaseSigner && !approver) {
    return null;
  }

  if (releaseSigner === seller || (approver === seller && releaseSigner !== buyer)) {
    return 'Este contrato tiene roles antiguos (el vendedor podía liberar). Pide un link de pago nuevo.';
  }
  if (releaseSigner && releaseSigner !== buyer) {
    return 'La wallet conectada no es quien libera fondos en este contrato. Conecta la wallet del comprador.';
  }
  if (approver && approver !== buyer) {
    return 'El comprador no está configurado como quien aprueba en el contrato.';
  }
  if (receiver && receiver !== seller) {
    return 'El beneficiario del contrato no coincide con el vendedor.';
  }
  return null;
}

/** Wallet que debe firmar approve-milestone (cliente en marketplace). */
export function resolveEscrowApprover(
  escrow: DealEscrowIndexerRow | null,
  connectedWallet: string,
): string {
  const { approver } = escrow ? extractEscrowRoles(escrow) : { approver: '' };
  return approver || connectedWallet.trim();
}

/** Wallet que debe firmar release-funds (releaseSigner o approver). */
export function resolveEscrowReleaseSigner(
  escrow: DealEscrowIndexerRow | null,
  connectedWallet: string,
): string {
  if (!escrow) return connectedWallet.trim();
  const { approver, releaseSigner } = extractEscrowRoles(escrow);
  return releaseSigner || approver || connectedWallet.trim();
}

export function assertClientCanSignEscrowAction(
  expectedSigner: string,
  connectedWallet: string,
  actionLabel: string,
): void {
  const expected = expectedSigner.trim();
  const connected = connectedWallet.trim();
  if (!expected || !connected || expected === connected) return;
  throw new Error(
    `La wallet conectada no es quien debe firmar (${actionLabel}). ` +
      `Conecta ${expected.slice(0, 6)}…${expected.slice(-4)} (cliente del escrow).`,
  );
}
