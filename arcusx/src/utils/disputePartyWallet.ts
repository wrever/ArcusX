import { platformWallet } from '../config/trustlessWork';

function pickStellarWallet(...candidates: (string | null | undefined)[]): string | null {
  for (const w of candidates) {
    if (typeof w === 'string' && w.startsWith('G') && w.length === 56) return w;
  }
  return null;
}

export type DisputeWalletPick = {
  wallet: string;
  source:
    | 'escrow_signer'
    | 'escrow_approver'
    | 'escrow_service_provider'
    | 'escrow_receiver'
    | 'task_funder'
    | 'proposal_wallet'
    | 'user_profile';
  isPlatformTreasury: boolean;
};

function isTreasuryWallet(wallet: string, platform: string, escrowRoles?: Record<string, string | undefined>): boolean {
  if (!wallet) return false;
  if (platform && wallet === platform) return true;
  const platformRole = escrowRoles?.platformAddress?.trim();
  if (platformRole && wallet === platformRole) return true;
  return false;
}

/**
 * Wallet que debe recibir el reembolso al cliente (empleador que fondeó).
 */
export function resolveClientRefundWallet(opts: {
  escrow?: { roles?: Record<string, string | undefined>; signer?: string };
  taskFunderWallet?: string | null;
  dbUserWallet?: string | null;
  platformWallet?: string;
}): DisputeWalletPick | null {
  const roles = opts.escrow?.roles ?? {};
  const platform = (opts.platformWallet ?? platformWallet())?.trim() || '';

  const signer = pickStellarWallet(roles.signer, opts.escrow?.signer);
  if (signer) {
    return {
      wallet: signer,
      source: 'escrow_signer',
      isPlatformTreasury: isTreasuryWallet(signer, platform, roles),
    };
  }

  const approver = pickStellarWallet(roles.approver, roles.releaseSigner);
  if (approver) {
    return {
      wallet: approver,
      source: 'escrow_approver',
      isPlatformTreasury: isTreasuryWallet(approver, platform, roles),
    };
  }

  const funder = pickStellarWallet(opts.taskFunderWallet);
  if (funder) {
    return {
      wallet: funder,
      source: 'task_funder',
      isPlatformTreasury: isTreasuryWallet(funder, platform, roles),
    };
  }

  const profile = pickStellarWallet(opts.dbUserWallet);
  if (profile) {
    return {
      wallet: profile,
      source: 'user_profile',
      isPlatformTreasury: isTreasuryWallet(profile, platform, roles),
    };
  }

  return null;
}

/**
 * Wallet que debe recibir el pago al trabajador.
 * Prioridad: serviceProvider/receiver on-chain → wallet de la propuesta aceptada → perfil.
 */
export function resolveWorkerPayoutWallet(opts: {
  escrow?: { roles?: Record<string, string | undefined> };
  proposalWorkerWallet?: string | null;
  dbUserWallet?: string | null;
  platformWallet?: string;
}): DisputeWalletPick | null {
  const roles = opts.escrow?.roles ?? {};
  const platform = (opts.platformWallet ?? platformWallet())?.trim() || '';

  const serviceProvider = pickStellarWallet(roles.serviceProvider);
  if (serviceProvider) {
    return {
      wallet: serviceProvider,
      source: 'escrow_service_provider',
      isPlatformTreasury: isTreasuryWallet(serviceProvider, platform, roles),
    };
  }

  const receiver = pickStellarWallet(roles.receiver);
  if (receiver) {
    return {
      wallet: receiver,
      source: 'escrow_receiver',
      isPlatformTreasury: isTreasuryWallet(receiver, platform, roles),
    };
  }

  const proposal = pickStellarWallet(opts.proposalWorkerWallet);
  if (proposal) {
    return {
      wallet: proposal,
      source: 'proposal_wallet',
      isPlatformTreasury: isTreasuryWallet(proposal, platform, roles),
    };
  }

  const profile = pickStellarWallet(opts.dbUserWallet);
  if (profile) {
    return {
      wallet: profile,
      source: 'user_profile',
      isPlatformTreasury: isTreasuryWallet(profile, platform, roles),
    };
  }

  return null;
}

export type DisputePayoutTargets = {
  client: DisputeWalletPick;
  worker: DisputeWalletPick | null;
};

export function resolveDisputePayoutTargets(opts: {
  escrow: { roles?: Record<string, string | undefined>; signer?: string };
  taskFunderWallet?: string | null;
  proposalWorkerWallet?: string | null;
  dbClientWallet?: string | null;
  dbWorkerWallet?: string | null;
  platformWallet?: string;
}): DisputePayoutTargets {
  const client = resolveClientRefundWallet({
    escrow: opts.escrow,
    taskFunderWallet: opts.taskFunderWallet,
    dbUserWallet: opts.dbClientWallet,
    platformWallet: opts.platformWallet,
  });
  if (!client) {
    throw new Error('CLIENT_WALLET_UNRESOLVED');
  }

  const worker = resolveWorkerPayoutWallet({
    escrow: opts.escrow,
    proposalWorkerWallet: opts.proposalWorkerWallet,
    dbUserWallet: opts.dbWorkerWallet,
    platformWallet: opts.platformWallet,
  });

  return { client, worker };
}

export function assertPayoutWalletAllowed(
  pick: DisputeWalletPick,
  party: 'client' | 'worker',
): void {
  if (pick.isPlatformTreasury) {
    throw new Error(
      party === 'client' ? 'CLIENT_TREASURY_BLOCKED' : 'WORKER_TREASURY_BLOCKED',
    );
  }
}

const STROOPS = 10_000_000;

/** Reparto exacto del balance del escrow (suma = balance) para split on-chain. */
export function allocateDisputeSplitAmounts(
  balance: number,
  refundPercentage: number,
): { clientAmount: number; workerAmount: number } {
  if (refundPercentage <= 0 || refundPercentage >= 100) {
    throw new Error('SPLIT_PERCENT_INVALID');
  }
  const totalStroops = Math.round(balance * STROOPS);
  if (totalStroops <= 0) throw new Error('SPLIT_BALANCE_ZERO');
  const clientStroops = Math.round((totalStroops * refundPercentage) / 100);
  const workerStroops = totalStroops - clientStroops;
  if (clientStroops <= 0 || workerStroops <= 0) {
    throw new Error('SPLIT_AMOUNT_TOO_SMALL');
  }
  return {
    clientAmount: clientStroops / STROOPS,
    workerAmount: workerStroops / STROOPS,
  };
}

export function assertDisputePayoutsForDecision(
  decision: 'client' | 'worker' | 'split',
  targets: DisputePayoutTargets,
): { clientWallet: string; workerWallet: string | null } {
  if (decision === 'client' || decision === 'split') {
    assertPayoutWalletAllowed(targets.client, 'client');
  }
  if (decision === 'worker' || decision === 'split') {
    if (!targets.worker) {
      throw new Error('WORKER_WALLET_UNRESOLVED');
    }
    assertPayoutWalletAllowed(targets.worker, 'worker');
    if (targets.worker.wallet === targets.client.wallet) {
      throw new Error('SAME_CLIENT_WORKER_WALLET');
    }
  }

  return {
    clientWallet: targets.client.wallet,
    workerWallet: targets.worker?.wallet ?? null,
  };
}
