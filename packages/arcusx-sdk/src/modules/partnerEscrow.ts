import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { RequestOptions } from '../types.js';

export type PartnerEscrowPrepareDeployInput = {
  clientWallet: string;
  workerWallet: string;
  amountUsdc: number;
  externalId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Escrow motor for integrators — API key only (no ArcusX JWT).
 * Pass wallets + amount; ArcusX applies fee; partner signs XDR in their app.
 */
export function createPartnerEscrowModule(client: ArcusXClient) {
  return {
    prepareDeploy(input: PartnerEscrowPrepareDeployInput, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowDeployPrepare,
        LEGACY_ACTIONS.partnerEscrowDeployPrepare,
        {
          client_wallet: input.clientWallet,
          worker_wallet: input.workerWallet,
          amount_usdc: input.amountUsdc,
          external_id: input.externalId,
          title: input.title,
          description: input.description,
          metadata: input.metadata,
        },
        opts,
      );
    },

    confirmDeploy(
      escrowId: string,
      input: { contractId?: string; deployTxHash?: string; signedXdr?: string },
      opts?: RequestOptions,
    ) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowDeployConfirm(escrowId),
        LEGACY_ACTIONS.partnerEscrowDeployConfirm,
        {
          escrow_id: escrowId,
          contract_id: input.contractId,
          deploy_tx_hash: input.deployTxHash,
          signed_xdr: input.signedXdr,
        },
        opts,
      );
    },

    prepareFund(escrowId: string, clientWallet: string, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowFundPrepare(escrowId),
        LEGACY_ACTIONS.partnerEscrowFundPrepare,
        { escrow_id: escrowId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmFund(
      escrowId: string,
      input: { fundTxHash?: string; signedXdr?: string; contractId?: string },
      opts?: RequestOptions,
    ) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowFundConfirm(escrowId),
        LEGACY_ACTIONS.partnerEscrowFundConfirm,
        {
          escrow_id: escrowId,
          fund_tx_hash: input.fundTxHash,
          signed_xdr: input.signedXdr,
          contract_id: input.contractId,
        },
        opts,
      );
    },

    prepareComplete(escrowId: string, workerWallet: string, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowCompletePrepare(escrowId),
        LEGACY_ACTIONS.partnerEscrowCompletePrepare,
        { escrow_id: escrowId, worker_wallet: workerWallet },
        opts,
      );
    },

    confirmComplete(
      escrowId: string,
      input: { signedXdr?: string | string[]; txHash?: string },
      opts?: RequestOptions,
    ) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowCompleteConfirm(escrowId),
        LEGACY_ACTIONS.partnerEscrowCompleteConfirm,
        {
          escrow_id: escrowId,
          signed_xdr: input.signedXdr,
          tx_hash: input.txHash,
        },
        opts,
      );
    },

    /** Cliente: approve → release (2 firmas). Requiere prepareComplete previo del worker. */
    prepareRelease(escrowId: string, clientWallet: string, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowReleasePrepare(escrowId),
        LEGACY_ACTIONS.partnerEscrowReleasePrepare,
        { escrow_id: escrowId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmRelease(
      escrowId: string,
      input:
        | string
        | {
            releaseTxHash?: string;
            signedXdr?: string | string[];
            /** approve | release */
            step?: string;
          },
      opts?: RequestOptions,
    ) {
      const body =
        typeof input === 'string'
          ? { escrow_id: escrowId, release_tx_hash: input, step: 'release' }
          : {
              escrow_id: escrowId,
              release_tx_hash: input.releaseTxHash,
              signed_xdr: input.signedXdr,
              step: input.step ?? 'release',
            };
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerEscrowReleaseConfirm(escrowId),
        LEGACY_ACTIONS.partnerEscrowReleaseConfirm,
        body,
        opts,
      );
    },

    get(escrowId: string, opts?: RequestOptions) {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.partnerEscrow(escrowId),
        LEGACY_ACTIONS.partnerEscrowGet,
        { escrow_id: escrowId },
        opts,
      );
    },

    list(opts?: RequestOptions) {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.partnerEscrows,
        LEGACY_ACTIONS.partnerEscrowList,
        {},
        opts,
      );
    },
  };
}

export type PartnerEscrowModule = ReturnType<typeof createPartnerEscrowModule>;
