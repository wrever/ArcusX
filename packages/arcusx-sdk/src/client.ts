import { createHttpClient, type HttpClient } from './http.js';
import { DEFAULT_PARTNER_API_BASE } from './auth.js';
import { createAgentModule, type AgentModule } from './modules/agent.js';
import { createDealsModule, type DealsModule } from './modules/deals.js';
import { createDisputesModule, type DisputesModule } from './modules/disputes.js';
import { createEvidenceModule, type EvidenceModule } from './modules/evidence.js';
import { createRatingsModule, type RatingsModule } from './modules/ratings.js';
import { createTrustModule, type TrustModule } from './modules/trust.js';
import { createWebhooksModule, type WebhooksModule } from './modules/webhooks.js';
import { createEscrowModule, type EscrowModule } from './modules/escrow.js';
import { createMarketplaceModule, type MarketplaceModule } from './modules/marketplace.js';
import { createPrivateModule, type PrivateModule } from './modules/private.js';
import { createPublicModule, type PublicModule } from './modules/public.js';
import { createSettlementModule, type SettlementModule } from './modules/settlement.js';
import type { Network } from './types.js';

export interface ArcusXClientConfig {
  /**
   * Base URL del API partner.
   * Default: https://api.arcusx.pro (gateway; no requiere anon key Supabase).
   * Override solo para entorno interno ArcusX (…/functions/v1/arcusx-api).
   */
  baseUrl?: string;
  /** Partner API key — única credencial para integradores (Bearer axk_test_ / axk_live_). */
  apiKey?: string;
  /** JWT app tras OAuth — solo embed/dashboard; no agentes en producción. */
  bearerToken?: string;
  /** Anon Supabase — solo uso interno ArcusX; no entregar a partners. */
  supabaseAnonKey?: string;
  network?: Network;
  /** default false — use REST /v1/ */
  useLegacyActions?: boolean;
  fetch?: typeof fetch;
}

export class ArcusXClient {
  readonly config: ArcusXClientConfig;
  readonly http: HttpClient;

  readonly public: PublicModule;
  readonly marketplace: MarketplaceModule;
  readonly private: PrivateModule;
  readonly deals: DealsModule;
  readonly escrow: EscrowModule;
  readonly settlement: SettlementModule;
  readonly disputes: DisputesModule;
  readonly evidence: EvidenceModule;
  readonly ratings: RatingsModule;
  readonly trust: TrustModule;
  readonly webhooks: WebhooksModule;
  readonly agent: AgentModule;

  constructor(config: ArcusXClientConfig) {
    if (!config.apiKey?.trim() && !config.bearerToken?.trim()) {
      throw new Error('ArcusXClient: apiKey or bearerToken is required');
    }
    this.config = {
      useLegacyActions: false,
      network: 'testnet',
      baseUrl: config.baseUrl?.trim() || DEFAULT_PARTNER_API_BASE,
      ...config,
    };
    this.http = createHttpClient(this.config);
    this.public = createPublicModule(this);
    this.marketplace = createMarketplaceModule(this);
    this.private = createPrivateModule(this);
    this.deals = createDealsModule(this);
    this.escrow = createEscrowModule(this);
    this.settlement = createSettlementModule(this);
    this.disputes = createDisputesModule(this);
    this.evidence = createEvidenceModule(this);
    this.ratings = createRatingsModule(this);
    this.trust = createTrustModule(this);
    this.webhooks = createWebhooksModule(this);
    this.agent = createAgentModule(this);
  }

  /** Update bearer token after OAuth without recreating client. */
  setBearerToken(token: string | undefined): void {
    this.config.bearerToken = token;
  }

  /** Update partner API key. */
  setApiKey(key: string | undefined): void {
    this.config.apiKey = key;
  }
}
