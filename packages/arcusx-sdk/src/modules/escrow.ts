import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { CreateEscrowInput, EscrowQuoteResponse, EscrowStatus, RequestOptions } from '../types.js';

export function createEscrowModule(client: ArcusXClient) {
  return {
    /** Quote bilateral antes de fondear — sin exponer TW al integrador. */
    quote(nominalUsdc: number, opts?: RequestOptions): Promise<EscrowQuoteResponse> {
      return httpGet<EscrowQuoteResponse>(
        client.http,
        client.config,
        REST_PATHS.escrowQuote,
        LEGACY_ACTIONS.getEscrowQuote,
        { nominal: nominalUsdc },
        opts,
      );
    },

    createForTask(
      taskId: number,
      proposalId: number,
      body?: Omit<CreateEscrowInput, 'task_id' | 'proposal_id'>,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskEscrow(taskId),
        LEGACY_ACTIONS.createEscrow,
        { task_id: taskId, proposal_id: proposalId, ...body },
        opts,
      );
    },

    status(taskId: number, escrowId?: string, opts?: RequestOptions): Promise<EscrowStatus> {
      return httpGet<EscrowStatus>(
        client.http,
        client.config,
        REST_PATHS.taskEscrow(taskId),
        LEGACY_ACTIONS.getEscrowStatus,
        { task_id: taskId, ...(escrowId ? { escrow_id: escrowId } : {}) },
        opts,
      );
    },

    markWorkStarted(taskId: number, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.taskEscrowWorkStarted(taskId),
        LEGACY_ACTIONS.markWorkStarted,
        { task_id: taskId },
        opts,
      );
    },

    /** Paso 1 marketplace: ArcusX genera XDR deploy (TW oculto). */
    prepareDeploy(
      taskId: number,
      proposalId: number,
      clientWallet: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.escrowDeployPrepare(taskId),
        LEGACY_ACTIONS.prepareEscrowDeploy,
        { task_id: taskId, proposal_id: proposalId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmDeploy(
      taskId: number,
      input: {
        proposalId: number;
        contractId?: string;
        deployTxHash?: string;
        signedXdr?: string;
        clientWallet?: string;
      },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.escrowDeployConfirm(taskId),
        LEGACY_ACTIONS.confirmEscrowDeploy,
        {
          task_id: taskId,
          proposal_id: input.proposalId,
          contract_id: input.contractId,
          escrow_id: input.contractId,
          deploy_tx_hash: input.deployTxHash,
          signed_xdr: input.signedXdr,
          client_wallet: input.clientWallet,
        },
        opts,
      );
    },

    prepareFund(
      taskId: number,
      clientWallet: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.escrowFundPrepare(taskId),
        LEGACY_ACTIONS.prepareEscrowFund,
        { task_id: taskId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmFund(
      taskId: number,
      input: {
        proposalId: number;
        contractId: string;
        fundTxHash: string;
        clientWallet?: string;
      },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.escrowFundConfirm(taskId),
        LEGACY_ACTIONS.confirmEscrowFund,
        {
          task_id: taskId,
          proposal_id: input.proposalId,
          contract_id: input.contractId,
          escrow_id: input.contractId,
          fund_tx_hash: input.fundTxHash,
          transaction_hash: input.fundTxHash,
          funding_confirmed: true,
          client_wallet: input.clientWallet,
        },
        opts,
      );
    },

    prepareRelease(
      taskId: number,
      clientWallet: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.escrowReleasePrepare(taskId),
        LEGACY_ACTIONS.prepareEscrowRelease,
        { task_id: taskId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmRelease(
      taskId: number,
      releaseTxHash: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.escrowReleaseConfirm(taskId),
        LEGACY_ACTIONS.confirmEscrowRelease,
        { task_id: taskId, release_tx_hash: releaseTxHash, tx_hash: releaseTxHash },
        opts,
      );
    },

    prepareDealEscrow(
      dealId: string,
      body: {
        escrow_id: string;
        transaction_hash?: string;
        wallet_address?: string;
      },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.dealEscrowPrepare(dealId),
        LEGACY_ACTIONS.prepareDealEscrow,
        { agreement_id: dealId, ...body },
        opts,
      );
    },

    finalizeDealEscrow(
      dealId: string,
      body: {
        escrow_id: string;
        transaction_hash?: string;
        wallet_address?: string;
      },
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.dealEscrowFinalize(dealId),
        LEGACY_ACTIONS.finalizeDealEscrow,
        { agreement_id: dealId, ...body },
        opts,
      );
    },
  };
}

export type EscrowModule = ReturnType<typeof createEscrowModule>;
