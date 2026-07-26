import type { ArcusXClient } from '../client.js';
import { httpGet, httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { AgreementDeal, CreateDealInput, RequestOptions } from '../types.js';

export function createDealsModule(client: ArcusXClient) {
  return {
    create(input: CreateDealInput, opts?: RequestOptions): Promise<{
      agreement: AgreementDeal;
      deal_token: string;
      deal_url_path: string;
    }> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.deals,
        LEGACY_ACTIONS.createDeal,
        input,
        opts,
      );
    },

    getByToken(token: string, opts?: RequestOptions): Promise<{
      deal: AgreementDeal;
      viewer_role?: string;
      can_accept?: boolean;
    }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.dealToken(token),
        LEGACY_ACTIONS.getDealByToken,
        { deal_token: token },
        opts,
      );
    },

    get(dealId: string, opts?: RequestOptions): Promise<{ deal: AgreementDeal }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.deal(dealId),
        LEGACY_ACTIONS.getDealDetails,
        { agreement_id: dealId },
        opts,
      );
    },

    list(opts?: RequestOptions): Promise<{ deals: AgreementDeal[] }> {
      return httpGet(
        client.http,
        client.config,
        REST_PATHS.deals,
        LEGACY_ACTIONS.getMyDeals,
        undefined,
        opts,
      );
    },

    accept(
      dealToken: string,
      walletAddress: string,
      opts?: RequestOptions,
    ): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.dealAccept(dealToken),
        LEGACY_ACTIONS.acceptDeal,
        { deal_token: dealToken, wallet_address: walletAddress },
        opts,
      );
    },

    complete(dealId: string, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.dealComplete(dealId),
        LEGACY_ACTIONS.completeDeal,
        { agreement_id: dealId },
        opts,
      );
    },
  };
}

export type DealsModule = ReturnType<typeof createDealsModule>;
