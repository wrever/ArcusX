import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { fundSubjob, paySubjobEndToEnd, releaseSubjob } from '../agent/tw-payment.js';
import type { FundSubjobResult, ReleaseSubjobResult } from '../agent/tw-payment.js';
import { REST_PATHS, LEGACY_ACTIONS } from '../rest/paths.js';
import type { WalletAdapter } from '../wallet/adapter.js';
import type {
  AttestSubjobInput,
  CreateJobInput,
  CreateSubjobInput,
  JobDetails,
  RequestOptions,
  SubjobDetails,
  SubjobEscrowQuoteResponse,
} from '../types.js';

export function createAgentModule(client: ArcusXClient) {
  return {
    create(input: CreateJobInput, opts?: RequestOptions): Promise<{ job_id: string; job: JobDetails }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.jobs,
        LEGACY_ACTIONS.createJob,
        input,
        opts,
      );
    },

    get(jobId: string, opts?: RequestOptions): Promise<{ job: JobDetails }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.job(jobId),
        LEGACY_ACTIONS.getJob,
        { job_id: jobId },
        opts,
      );
    },

    list(opts?: RequestOptions): Promise<{ jobs: JobDetails[]; count: number }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.jobs,
        LEGACY_ACTIONS.listJobs,
        undefined,
        opts,
      );
    },

    createSubjob(
      jobId: string,
      input: CreateSubjobInput,
      opts?: RequestOptions,
    ): Promise<{ subjob_id: string; task_id: number; proposal_id: number | null; subjob: SubjobDetails }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.jobSubjobs(jobId),
        LEGACY_ACTIONS.createSubjob,
        { job_id: jobId, ...input },
        opts,
      );
    },

    getSubjob(subjobId: string, opts?: RequestOptions): Promise<{ subjob: SubjobDetails }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.subjob(subjobId),
        LEGACY_ACTIONS.getSubjob,
        { subjob_id: subjobId },
        opts,
      );
    },

    quoteEscrow(subjobId: string, opts?: RequestOptions): Promise<SubjobEscrowQuoteResponse> {
      return httpGet<SubjobEscrowQuoteResponse>(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowQuote(subjobId),
        LEGACY_ACTIONS.subjobEscrowQuote,
        { subjob_id: subjobId },
        opts,
      );
    },

    prepareDeploy(
      subjobId: string,
      clientWallet: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowDeployPrepare(subjobId),
        LEGACY_ACTIONS.subjobEscrowDeployPrepare,
        { subjob_id: subjobId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmDeploy(
      subjobId: string,
      body: Record<string, unknown>,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowDeployConfirm(subjobId),
        LEGACY_ACTIONS.subjobEscrowDeployConfirm,
        { subjob_id: subjobId, ...body },
        opts,
      );
    },

    prepareFund(
      subjobId: string,
      clientWallet: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowFundPrepare(subjobId),
        LEGACY_ACTIONS.subjobEscrowFundPrepare,
        { subjob_id: subjobId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmFund(
      subjobId: string,
      body: Record<string, unknown>,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowFundConfirm(subjobId),
        LEGACY_ACTIONS.subjobEscrowFundConfirm,
        {
          subjob_id: subjobId,
          funding_confirmed: true,
          ...body,
        },
        opts,
      );
    },

    prepareRelease(
      subjobId: string,
      clientWallet: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowReleasePrepare(subjobId),
        LEGACY_ACTIONS.subjobEscrowReleasePrepare,
        { subjob_id: subjobId, client_wallet: clientWallet },
        opts,
      );
    },

    confirmRelease(
      subjobId: string,
      body: Record<string, unknown>,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobEscrowReleaseConfirm(subjobId),
        LEGACY_ACTIONS.subjobEscrowReleaseConfirm,
        {
          subjob_id: subjobId,
          escrow_completed: true,
          action: 'accept',
          ...body,
        },
        opts,
      );
    },

    attest(
      subjobId: string,
      input: AttestSubjobInput,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobAttest(subjobId),
        LEGACY_ACTIONS.attestSubjob,
        { subjob_id: subjobId, ...input },
        opts,
      );
    },

    releaseOnCallback(
      subjobId: string,
      clientWallet: string,
      body?: Record<string, unknown>,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobReleaseOnCallback(subjobId),
        LEGACY_ACTIONS.releaseSubjobOnCallback,
        { subjob_id: subjobId, client_wallet: clientWallet, ...body },
        opts,
      );
    },

    listSubjobsMine(opts?: RequestOptions): Promise<{ subjobs: SubjobDetails[]; count: number }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.subjobsMine,
        LEGACY_ACTIONS.listSubjobsMine,
        undefined,
        opts,
      );
    },

    markWorkStarted(subjobId: string, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobWorkStarted(subjobId),
        LEGACY_ACTIONS.subjobMarkWorkStarted,
        { subjob_id: subjobId },
        opts,
      );
    },

    cancelSubjob(subjobId: string, opts?: RequestOptions): Promise<{ subjob_id: string; cancelled: boolean }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobCancel(subjobId),
        LEGACY_ACTIONS.cancelSubjob,
        { subjob_id: subjobId },
        opts,
      );
    },

    cancelJob(jobId: string, opts?: RequestOptions): Promise<{ job_id: string; cancelled: boolean }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.jobCancel(jobId),
        LEGACY_ACTIONS.cancelJob,
        { job_id: jobId },
        opts,
      );
    },

    linkProposal(
      subjobId: string,
      proposalId: number,
      opts?: RequestOptions,
    ): Promise<{ subjob_id: string; proposal_id: number; subjob: SubjobDetails | null }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.subjobLinkProposal(subjobId),
        LEGACY_ACTIONS.linkSubjobProposal,
        { subjob_id: subjobId, proposal_id: proposalId },
        opts,
      );
    },

    /** Paga subjob: deploy + fund escrow TW (wallet firma XDR, Edge envía vía TW). */
    fundSubjob(
      subjobId: string,
      wallet: WalletAdapter,
      opts?: RequestOptions,
    ): Promise<FundSubjobResult> {
      return fundSubjob(client, subjobId, wallet, opts);
    },

    /** Libera USDC al ejecutor (approve + release TW). */
    releaseSubjob(
      subjobId: string,
      wallet: WalletAdapter,
      opts?: RequestOptions,
    ): Promise<ReleaseSubjobResult> {
      return releaseSubjob(client, subjobId, wallet, opts);
    },

    /** Atajo fund (+ release opcional). */
    pay(
      subjobId: string,
      wallet: WalletAdapter,
      opts?: RequestOptions & { skipRelease?: boolean },
    ): Promise<{ funded: FundSubjobResult; released?: ReleaseSubjobResult }> {
      return paySubjobEndToEnd(client, subjobId, wallet, opts);
    },
  };
}

export type AgentModule = ReturnType<typeof createAgentModule>;
