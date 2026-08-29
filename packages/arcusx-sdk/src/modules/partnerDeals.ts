/**
 * Partner Deals — payment links (API key only).
 * Spec: docs/sdk/PARTNER_DEALS.md · Edge `/v1/partner/deals` live Testnet.
 */
import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { RequestOptions } from '../types.js';

export type PartnerDealCreateInput = {
  amountUsdc: number;
  payeeWallet: string;
  title: string;
  payerWallet?: string;
  externalId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export function createPartnerDealsModule(client: ArcusXClient) {
  return {
    /** Create a shareable payment-link deal (escrow behind the token). */
    create(input: PartnerDealCreateInput, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerDeals,
        LEGACY_ACTIONS.partnerDealCreate,
        {
          amount_usdc: input.amountUsdc,
          payee_wallet: input.payeeWallet,
          payer_wallet: input.payerWallet,
          title: input.title,
          description: input.description,
          external_id: input.externalId,
          metadata: input.metadata,
        },
        opts,
      );
    },

    getByToken(dealToken: string, opts?: RequestOptions) {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.partnerDealToken(dealToken),
        LEGACY_ACTIONS.partnerDealGetByToken,
        { deal_token: dealToken },
        opts,
      );
    },

    get(dealId: string, opts?: RequestOptions) {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.partnerDeal(dealId),
        LEGACY_ACTIONS.partnerDealGet,
        { deal_id: dealId },
        opts,
      );
    },

    list(opts?: RequestOptions) {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.partnerDeals,
        LEGACY_ACTIONS.partnerDealList,
        {},
        opts,
      );
    },

    prepareFund(dealId: string, payerWallet: string, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerDealFundPrepare(dealId),
        LEGACY_ACTIONS.partnerDealFundPrepare,
        { deal_id: dealId, payer_wallet: payerWallet, client_wallet: payerWallet },
        opts,
      );
    },

    confirmFund(
      dealId: string,
      input: {
        fundTxHash?: string;
        signedXdr?: string;
        contractId?: string;
        deployTxHash?: string;
        /** Use 'deploy' after prepareFund returns step=deploy */
        step?: 'deploy' | 'fund';
      },
      opts?: RequestOptions,
    ) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerDealFundConfirm(dealId),
        LEGACY_ACTIONS.partnerDealFundConfirm,
        {
          deal_id: dealId,
          fund_tx_hash: input.fundTxHash,
          deploy_tx_hash: input.deployTxHash,
          signed_xdr: input.signedXdr,
          contract_id: input.contractId,
          step: input.step,
        },
        opts,
      );
    },

    prepareRelease(dealId: string, releaseSignerWallet: string, opts?: RequestOptions) {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerDealReleasePrepare(dealId),
        LEGACY_ACTIONS.partnerDealReleasePrepare,
        { deal_id: dealId, client_wallet: releaseSignerWallet },
        opts,
      );
    },

    confirmRelease(
      dealId: string,
      input: string | {
        releaseTxHash?: string;
        signedXdr?: string | string[];
        /** approve for the first signature, release for the final payout */
        step?: string;
      },
      opts?: RequestOptions,
    ) {
      const body =
        typeof input === 'string'
          ? { deal_id: dealId, release_tx_hash: input }
          : {
              deal_id: dealId,
              release_tx_hash: input.releaseTxHash,
              signed_xdr: input.signedXdr,
              step: input.step ?? 'release',
            };
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.partnerDealReleaseConfirm(dealId),
        LEGACY_ACTIONS.partnerDealReleaseConfirm,
        body,
        opts,
      );
    },
  };
}

export type PartnerDealsModule = ReturnType<typeof createPartnerDealsModule>;
